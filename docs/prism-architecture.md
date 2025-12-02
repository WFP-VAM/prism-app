# **PRISM Architecture**

*Repository-based Technical Overview*

This document provides a high-level, source-of-truth architecture overview of the **PRISM** application. It is intended for developers, maintainers, and technical reviewers.

PRISM consists of two main runtime components:

* A **config-driven frontend** for geospatial visualization and interaction

* A **lightweight backend API** for zonal statistics, alert management, data integration, and raster exports

Additional supporting packages exist for shared code and alerting.

---

# **1\. Repository Structure**

`prism-app/`

`│`

`├── frontend/        # React-based SPA viewer (static build)`

`├── api/             # Lightweight Flask API (zonal stats, alerts, Kobo, ACLED, STAC exports)`

`├── alerting/        # Alert processing (integrated via docker-compose)`

`├── common/          # Shared code used across packages`

`├── docs/            # Documentation (this directory)`

`└── docker-compose.* # Local/dev deployment configurations`

---

# **2\. System Overview**

PRISM is a **web-based geospatial application** that allows users to visualize hazard layers, administrative boundaries, tables, and point data through a browser-based map interface.  
 It also exposes backend services for:

* Zonal statistics

* Alerts (CRUD)

* KoboToolbox form access

* ACLED incident access

* Raster export via STAC \+ S3

PRISM **does not include** a map server, database, or ingestion pipeline inside this repo.  
 Instead, it interoperates with **external WMS/OGC services**, **external STAC APIs**, **S3**, and **external vector/raster sources** via URLs defined in configuration.

This repo therefore contains the **application core**, not the entire operational ecosystem.

---

# **3\. C4 Level 1 — System Context**

`flowchart LR`

    `user[User (Analyst / Operator)]`

    `user --> FE[PRISM Frontend (React SPA)]`

    `FE --> API[PRISM API (Flask)]`

    `FE --> OGC[OGC Map Services (WMS/WFS/WMTS)\nExternal]`

    `API --> DB[(Alert Database)\nExternal]`

    `API --> S3[(S3 Bucket for Raster Exports)\nExternal]`

    `API --> STAC[STAC API\nExternal]`

    `API --> ACLED[ACLED API\nExternal]`

    `API --> KOBO[KoboToolbox API\nExternal]`

    `classDef ext fill:#eee,stroke:#888;`

    `class OGC,DB,S3,STAC,ACLED,KOBO ext;`

**PRISM (software system)** consists of:

* **Frontend SPA**

* **Backend API \+ alerting**  
   Everything else (WMS/OGC, STAC, S3, external APIs, database) is **outside** this repository.

---

# **4\. C4 Level 2 — Container View**

### **4.1 Frontend (Container)**

**Directory:** `frontend/`  
 **Type:** Static React single-page application (SPA)  
 **Responsibilities:**

* Load map, UI, boundaries, legends, layer lists, and tables

* Display raster layers via **WMS/OGC endpoints** configured in `prism.json`

* Load point layers, boundary files, CSVs, PMTiles, and other static assets

* Provide UI for alerts (optional via `alertFormActive`)

* Communicate with the backend API for:

  * Zonal statistics

  * Alerts

  * ACLED and Kobo data

  * Raster downloads

**Key design principle:**  
 PRISM frontend is **configuration-driven**, not hardcoded. Country deployments only override JSON configs.

---

### **4.2 API (Container)**

**Directory:** `api/`  
 **Type:** Lightweight **Flask** API  
 **Responsibilities:**

#### **1\. Zonal statistics (`/stats`)**

* Compute zonal statistics using:

  * **Remote GeoTIFFs** (via URL)

  * **GeoJSON boundaries** (inline or via URL)

  * Optional **WFS feature intersections**

* Return list or GeoJSON results

* Support grouping, filtering, and intersection thresholds

#### **2\. Alerts (`/alerts`, `/alerts-all`)**

* CRUD operations for alert records in an external database (`alert` table)

* JSON validation via `AlertModel`

#### **3\. ACLED Integration (`/acled`)**

* Proxy to ACLED API using API key \+ email

* Optional filters for fields and event dates

#### **4\. KoboToolbox Integration (`/kobo/forms`)**

* Retrieve form submissions from Kobo using username/password

* Filter by date, status, and selected fields

#### **5\. Raster Export (`/raster_geotiff`)**

* Query external STAC API for source raster

* Clip to a bounding box

* Save resulting GeoTIFF to **S3**

* Return pre-signed S3 URL

**Key architectural traits:**

* Stateless for `/stats`, `/acled`, `/kobo`, `/raster_geotiff`

* Stateful only via alert CRUD (external DB)

* Runs under **Traefik** reverse proxy in deployments

* Uses **AWS IAM** \+ **Secrets Manager** for credentials

---

### **4.3 Alerting Service (Container)**

**Directory:** `alerting/`  
 **Type:** Python service integrated via docker-compose  
 **Responsibilities (inferred from repository structure):**

* Operates on the same Docker network as the API

* Uses the same external database containing the `alert` table

* Performs alert evaluation and/or scheduling tasks

This README does not include internal details, so this remains high-level.

---

### **4.4 Common Library (Module)**

**Directory:** `common/`  
 Contains shared utilities, types, or logic used by multiple packages.  
 (Contents not visible in upstream README.)

---

# **5\. External Dependencies (Documented in Repo)**

The following systems are **not implemented or bundled** in this repo but are explicitly referenced by the frontend config and API README:

| External Service | Used By | Purpose |
| ----- | ----- | ----- |
| **WMS / OGC services** | Frontend | Loading raster map layers |
| **GeoJSON / PMTiles (HTTP/S3)** | Frontend | Admin boundaries, point layers |
| **KoboToolbox API** | API | Fetching form responses |
| **ACLED API** | API | Conflict incident data |
| **STAC API** | API | Locating rasters for export |
| **AWS S3** | API | Storing generated GeoTIFF exports |
| **Alert Database** | API/alerting | Storing alert records |
| **Traefik** | Deployment | Reverse proxy / routing |

---

# **6\. Data Flow Overview**

A simplified ingestion → processing → visualization → export workflow **based on this repo**:

`flowchart TD`

    `FE[Frontend (React SPA)]`

    `API[PRISM API (Flask)]`

    `OGC[WMS/OGC Services\n(External)]`

    `GEO[(GeoJSON / PMTiles\nStatic Assets)]`

    `DB[(Alert DB\nExternal)]`

    `ACLED[ACLED API\nExternal]`

    `KOBO[Kobo API\nExternal]`

    `STAC[STAC API\nExternal]`

    `S3[(S3 Bucket\nExternal)]`

    `FE -->|Load layers| OGC`

    `FE -->|Load boundaries / tables| GEO`

    `FE -->|Zonal Stats| API`

    `FE -->|Alerts UI| API`

    `FE -->|Request ACLED / Kobo data| API`

    `FE -->|Download Raster| API`

    `API --> DB`

    `API --> ACLED`

    `API --> KOBO`

    `API --> STAC`

    `API --> S3`

---

# **7\. Deployment Architecture**

The repo describes a **Traefik-based deployment** on a single EC2 instance:

* `docker-compose.deploy.yml` defines containers for:

  * PRISM API

  * Frontend (static assets served through Traefik)

  * Alerting service

* AWS integrations:

  * IAM role on EC2 for S3 access

  * Secrets in AWS Secrets Manager

* Operations guidance included:

  * Fixing AppArmor conflicts

  * Freeing disk space (`docker system prune`)

  * Killing bound ports

This is a **self-contained, Docker-based deployment** model suitable for:

* WFP-managed infrastructure

* Government-hosted servers

* Low-dependency environments

---

# **8\. Security Overview**

From deployment documentation, the following are enforced:

* **Secrets stored in AWS Secrets Manager**, not in code

* **IAM role** used for S3 read/write

* **EC2 security rules / whitelisting** for operator access

* **Traefik reverse proxy** handling TLS/HTTPS termination

* **API credentials** required for:

  * ACLED API

  * KoboToolbox

  * STAC access (implicitly via environment variables)

Authentication/authorization for API endpoints is **not defined** in the repo and should be documented separately if required.

---

# **9\. Summary**

This repository defines the **application core** of PRISM:

* A **config-driven React frontend** for geospatial visualization

* A **lightweight Flask backend** for zonal statistics, alerts, ACLED+Kobo access, and raster exports

* Supporting modules (`alerting`, `common`) and Docker-based deployment scripts

The repo explicitly **does not** include:

* A database

* A map server/WMS service

* A STAC server

* Data ingestion pipelines

* Raster preprocessing code

These are external dependencies configured via JSON files and environment variables.

This architecture allows PRISM to be portable, configurable, and deployable across diverse partner environments—including government servers, WFP cloud infrastructure, or local development machines.