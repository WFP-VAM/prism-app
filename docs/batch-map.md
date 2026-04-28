# Proposal: Asynchronous batch map export (SQS, EC2 workers, S3)

## Purpose

Batch map generation currently executes inside the main PRISM FastAPI process (`POST /export-map`), using Playwright to render many `/export` URLs per request. That design competes with interactive traffic and provides no durable progress signal. This document proposes an asynchronous pipeline: enqueue work on **Amazon SQS**, process it on **dedicated worker process(es)** (initially co-located with the API EC2 host, with a path to dedicated worker hosts later), persist artifacts in **S3**, track state in **Postgres**, and expose **job APIs** plus **presigned GET** downloads consistent with existing GeoTIFF behavior.

## Current system


| Area                            | Location                                                                                                     | Behavior                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Rendering                       | `[api/prism_app/export_maps.py](api/prism_app/export_maps.py)`                                               | `export_maps`, `BrowserPool`, `render_to_file`                                                       |
| HTTP                            | `[api/prism_app/main.py](api/prism_app/main.py)`                                                             | `POST /export-map` returns full PDF or ZIP in the response body                                      |
| UI batch flow                   | `[frontend/src/components/NavBar/PrintImage/image.tsx](frontend/src/components/NavBar/PrintImage/image.tsx)` | Single POST to `EXPORT_API_URL`; blocks until `response.blob()` completes                            |
| Presigned downloads (precedent) | `[api/prism_app/geotiff_from_stac_api.py](api/prism_app/geotiff_from_stac_api.py)`                           | `boto3` `generate_presigned_url` for `get_object`                                                    |
| Auth pattern                    | `[api/prism_app/auth.py](api/prism_app/auth.py)`                                                             | HTTP Basic + `Depends(validate_user)` on selected routes; `/export-map` is currently unauthenticated |


## Target architecture

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as FastAPI
  participant DB as Job_Store (in pg)
  participant Q as SQS
  participant W as Export worker
  participant S3 as S3

  UI->>API: POST /export-map/jobs (payload)
  API->>DB: insert job queued
  API->>Q: SendMessage(jobId)
  API-->>UI: 202 jobId

  loop Poll
    UI->>API: GET /export-map/jobs/{id}
    API->>DB: read status
    API-->>UI: status progress or presigned URL
  end

  W->>Q: ReceiveMessage
  W->>DB: mark running
  W->>W: Playwright export_maps logic
  W->>S3: putObject artifact
  W->>DB: succeeded plus S3 key
```



### Component summary


| Component         | Responsibility                                                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SQS**           | One message per batch job (body: `job_id` and/or serialized payload).                                                                                                                                                                                                                                         |
| **S3**            | Store final PDF or ZIP; API returns a **presigned GET** URL instead of streaming bytes through FastAPI.                                                                                                                                                                                                       |
| **Workers (EC2)** | Long-running process(es) (see below) that consume SQS and invoke the same Playwright pipeline as today. Early rollout can run API + worker on one EC2 instance as separate processes; later rollout can move workers to dedicated EC2 hosts (for scheduled batch maps).                                       |
| **Postgres**      | Full column list: see **Data model** below.                                                                                                                                                                                                                                                                   |
| **API**           | Validate `MapExportRequestModel`-compatible payloads; honor `Idempotency-Key`; insert row; send SQS message; return `202` + `job_id`. `GET` by id returns status and, when `succeeded`, a fresh presigned URL. Enqueue endpoint should use `Depends(validate_user)` unless product policy dictates otherwise. |


**Data model: `map_export_jobs`**


| Field                | Type     | Comments                                                    |
| -------------------- | -------- | ----------------------------------------------------------- |
| id                   | string   | primary key, uuid style                                     |
| request_fingerprint  | string   | SHA-256 (hex) of canonical representation of export request |
| request_payload_json | jsonb    | serialized MapExportRequestModel                            |
| status               | string   | `queued | running | succeeded | failed`                     |
| error_json           | jsonb    | optional: set when status is `failed`                       |
| s3_uri               | string   | s3://… uri, set when status is `succeeded`                  |
| content_type         | string   | `pdf | zip`                                                 |
| requested_by         | string   | principal from auth table                                   |
| created_at           | datetime |                                                             |
| started_at           | datetime |                                                             |
| finished_at          | datetime |                                                             |
| updated_at           | datetime |                                                             |


Composite index on `(requested_by, request_fingerprint)` to support deduplication queries

No `UNIQUE(requested_by, request_fingerprint)` is required if the product allows a **new** run after a terminal `failed` state; deduplication is enforced in the API (see next section)

## Worker process and EC2 hosting

The export **worker** is a separate OS process on the api EC2 instance that:

1. Receives SQS messages (long polling or polling loop) referencing a job identifier (and optional payload snapshot).
2. Transitions the job to `running` in Postgres, then invokes `*export_maps`* (Playwright loads each `.../export?...` URL; PDF merge or PNG zip as today).
3. Uploads the artifact to S3, updates the job row (`succeeded` + `s3_key`, or `failed` + error text), and **deletes** the SQS message on success.

**Deployment path:** Run the same container image as the API (Python + Playwright), with command `python -m prism_app.worker.export_map_worker` (or equivalent) instead of `uvicorn`.

- **Phase 1 (recommended now, 4-8 jobs/day):** run API and one worker process on the same EC2 instance as separate OS/container processes.
- **Phase 2 (when scheduling volume increases or API latency isolation is needed):** move worker process(es) to dedicated EC2 instance(s) or an Auto Scaling Group (min ≥ 1, max configurable), without changing API/queue/job-table contracts.

**Co-location guardrails (Phase 1):**

- Worker concurrency default should be `1` to avoid starving interactive API traffic.

### Worker Postgres

Required worker operations:

- `SELECT` job row by `id` (and optional ownership context if enforced at DB level).
- `UPDATE` to set `status='running'`, `started_at`, and periodic `progress_current` updates.
- Final `UPDATE` to set either:
  - success fields: `status='succeeded'`, `s3_bucket`, `s3_key`, `content_type`, `finished_at`; or
  - failure fields: `status='failed'`, `error_code`, `error_message`, `finished_at`.

Least-privilege recommendation:

- API role: `INSERT` + `SELECT` on `map_export_jobs` (plus optional `UPDATE` for cancellation endpoints).
- Worker role: `SELECT` + `UPDATE` on `map_export_jobs`; no DDL and no access to unrelated tables.
- Prefer separate DB credentials for API and worker; if shared initially, track role separation as a hardening follow-up.

## SQS visibility timeout

Configure a **single long `VisibilityTimeout`** on the queue (and matching receive parameters) sufficient for **P99 end-to-end** batch duration: Playwright rendering, PDF/ZIP packaging, S3 upload, and database updates, plus safety margin. **ChangeMessageVisibility** heartbeats are **out of scope** for the first release.

If a worker terminates mid-job, the message becomes visible again only after this timeout, delaying redelivery. Duplicate processing is avoided as long as the timeout exceeds actual processing time. Shorter recovery after crashes would require a future heartbeat-based design.

## Deduplication

**Fingerprint computation**

- Build a **canonical, stable representation** of the validated request (e.g. UTF-8 JSON with sorted object keys, preserving the `urls` array order because map sequence matters).
- Compute `**request_fingerprint` = SHA-256(canonical bytes)**, store as 64 hex characters in `map_export_jobs.request_fingerprint`.
- Fingerprint is scoped to `**requested_by`**: two users with identical map parameters are distinct jobs.

`**POST /export-map/jobs` behavior**

- Compute `request_fingerprint` and return it in the response
- Look up existing rows for `(requested_by, request_fingerprint)`:
  - If a job exists in `**queued` or `running`**, return `**200` or `202`** with that **existing** `jobId` (no second SQS message, no new row). Optional response flag `deduplicated: true`.
  - If a job exists in `**succeeded`**, return `**200` or `202`** with that `jobId` and `deduplicated: true` (same physical artifact) unless a **documented** rule requires a re-run (e.g. S3 object expired under lifecycle policy—in that case insert a new job).
  - If the most recent matching job is `**failed`**, either enqueue a **new** job (new row, same `request_fingerprint`) or return the failed `jobId` and expose an explicit **retry** action, depending on product UX—**pick one** and document. Multiple rows for the same fingerprint are allowed in this failure/retry case.

## Presigned URLs

Successful jobs expose downloads via **presigned GET** URLs only; the API does not stream artifact bytes. Implementation should mirror `[geotiff_from_stac_api.py](api/prism_app/geotiff_from_stac_api.py)`.

Implementation parameters (non-blocking):

- `*ExpiresIn`:** typically 15–60 minutes; must cover the interval between job completion and user download.
- **Regeneration:** generate a new presigned URL on each `GET /export-map/jobs/{id}` when `status === succeeded` so clients never receive an expired link while the job remains successful.
- **IAM:** the API execution role requires `s3:GetObject` permission on the artifact bucket (and `kms:Decrypt` if the bucket uses SSE-KMS) for the principal used in `generate_presigned_url`.

## Proposed changes

1. **Core export:** Retain `[export_maps](api/prism_app/export_maps.py)` as the single “URLs → bytes” implementation; optionally add disk-buffered helpers for very large batches to limit memory.
2. **New modules:** e.g. `prism_app/export_jobs.py` (SQLAlchemy model + CRUD), `prism_app/sqs_export.py` (boto3 send; configuration via `EXPORT_JOB_QUEUE_URL`, `EXPORT_S3_BUCKET`, region). Worker module: e.g. `prism_app/worker/export_map_worker.py` (poll SQS, `asyncio.run(export_maps(...))`, upload, update DB, delete message).
3. **Routes:** `POST /export-map/jobs`, `GET /export-map/jobs/{job_id}` as described above. Retain synchronous `POST /export-map` behind `*USE_SYNC_EXPORT_MAP`* (default `false` in production) until clients migrate, then remove or document deprecation.
4. **Frontend:** `[image.tsx](frontend/src/components/NavBar/PrintImage/image.tsx)`—enqueue, poll `GET` with backoff, display `progress_current` / `progress_total`, trigger download from `downloadUrl` when `succeeded`.
5. **Progress reporting:** Extend `export_maps` with an optional `on_progress(current, total)` (or equivalent) callback so the worker can update Postgres after each map without importing FastAPI into the core renderer.
6. **Tests:** Job lifecycle and idempotency with mocked SQS/S3; existing `[test_export_maps.py](api/prism_app/tests/test_export_maps.py)` continues to cover rendering; API tests for new routes via `TestClient`.

## Infrastructure

- SQS standard queue
- S3 bucket
- IAM: API—`sqs:SendMessage`, ability to presign `GetObject` on the result bucket; worker—`sqs:ReceiveMessage`, `DeleteMessage`, `s3:PutObject`, database access. In phase 1, these can be combined in one EC2 instance profile with least-privilege policy; in phase 2, split API and worker instance profiles.
- EC2 security groups: outbound HTTPS to SQS, S3, RDS (if applicable), and to whichever **network path** reaches the frontend URLs Playwright must load (public Internet or internal URL).

## **Estimated costs**

- Volume: **4-8 batch exports/day** (about 120-240 jobs/month).
- Initial rollout assumes one `c5.2xlarge` (8 vCPU, 16 GiB RAM) running both API and a single worker process, matching current production.
- Worker concurrency stays at `1` to protect API responsiveness.

**Phase 2 dedicated worker host (when needed):**

- EC2 `c5.2xlarge` on-demand: ~$248/month.
- EBS `gp3` 20 GB root volume: ~$1.6/month.

**Queue (SQS)**: near $0 (well under free tier / pennies at most).

**Storage (S3):** typically <$1/month unless retention and artifact size are increased.

**Projected total (for a separate dedicated worker host):**

- ~$250/month for one always-on `c5.2xlarge` worker after split-out.

## Local and non-production development

Primary local workflow: run both API and worker via **Docker Compose**, using the same application image with different commands.

Example shape (illustrative):

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: prism
      POSTGRES_USER: prism
      POSTGRES_PASSWORD: prism
    ports:
      - "5432:5432"
    volumes:
      - prism_postgres_data:/var/lib/postgresql/data

  api:
    build: ./api
    command: uvicorn prism_app.main:app --host 0.0.0.0 --port 80 --reload
    env_file:
      - ./api/.env
    environment:
      DB_URI: postgresql://prism:prism@postgres:5432/prism
    ports:
      - "80:80"
    depends_on:
      - postgres

  worker:
    build: ./api
    command: python -m prism_app.worker.export_map_worker
    env_file:
      - ./api/.env
    environment:
      DB_URI: postgresql://prism:prism@postgres:5432/prism
    depends_on:
      - api
      - postgres

volumes:
  prism_postgres_data:
```

