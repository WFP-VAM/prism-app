# PRISM Auth & Permissions

## Identity providers

PRISM Admin and session APIs support **two OIDC identity providers**:

| Provider | Env id | Typical users | Sign-in label on `/auth/welcome` |
|----------|--------|---------------|----------------------------------|
| **WFP CIAM** | `ciam` | Partners / non-domain users | Partner sign-in (CIAM) |
| **Microsoft Entra ID** | `entra` | Domain / staff users | Staff sign-in (Entra ID) |

Both use the same backend authorization-code + PKCE flow. Users pick a provider on **`/auth/welcome`** (or via `GET /auth/sign-in?provider=ciam|entra`). The React print-modal schedule feature redirects to `/auth/welcome` so users can choose before sign-in.

Application users are keyed by **`(auth_provider, ciam_sub)`** in the `users` table (`ciam_sub` holds the OIDC `sub` claim for any provider). The same `sub` value from two providers creates two distinct user rows.

---

## Quick Start: Adding a New **Admin** User

1. Have the user sign in (navigate to `/admin` or `/auth/welcome` — they'll pick CIAM or Entra, then authenticate).
2. They'll land on an "access not configured" page. Their `users` row now exists.
3. Have them visit `<host>/whoami` in their browser to get their `user_id` and `auth_provider`.

4. Grant admin access:

```bash
# From api/
poetry run python scripts/grant_admin_permission.py <user_id>
```

5. The user refreshes `/admin` — they're in.

## Quick Start: Adding a Non-Admin User

1. Have the user sign in via CIAM or Entra (any PRISM page that triggers auth).
2. They'll land on an "access not configured" page. Their `users` row now exists.
3. An admin navigates to `/admin` → **User permissions** → **Create**.
4. Select the user and the desired permission (e.g. `prism.content.view`).
5. The user refreshes — gated content is now accessible.

---

## User Creation

Users are created automatically (JIT) on first OIDC sign-in. When an authenticated user completes `/auth/callback` for the first time for a given provider:

1. A row is inserted into `users` with status `active`, `auth_provider`, OIDC `sub` (in `ciam_sub`), email, and display name.
2. The user starts with zero permissions — they'll see an "access not configured" page until granted at least one capability.

No manual user provisioning is needed; identities come from the chosen IdP.

## Permission Codes

| Code | Purpose | Status |
|------|---------|--------|
| `prism.admin.access` | Access the `/admin` panel | Active |
| `prism.content.view` | Read sign-in–gated content | Not enforced |
| `prism.dashboard.manage` | Create/edit/publish dashboards | Not enforced |
| `prism.deployment.manage` | Change deployment/system config | Not enforced |
| `prism.users.manage` | Provision users and assign permissions | Not enforced |

These are seeded by the `prism_users_permissions` Alembic migration.

## Feature Gating

### FastAPI dependencies

```python
from prism_app.auth.deps import require_permissions

# Require specific permission(s) on a route:
@app.get("/api/protected")
def protected(session=Depends(require_permissions("prism.content.view"))):
    user, codes = session
    ...
```

`require_permissions(*codes)` chains through `require_prism_session` (validates active session + active user status) then asserts all listed codes are present — returns **401** if unauthenticated, **403** if missing permissions.

### Admin panel views

All `/admin` model views inherit `PrismGatedModelView`, which checks `prism.admin.access` via `request.state.permission_codes` (set by `PrismAdminAuthMiddleware`).

## Auth-specific environment variables

### Configuration sources

There are three env var mechanisms that serve different contexts:

| Mechanism | When it's used |
|-----------|---------------|
| `api/.env` | Environment-specific host-side values (including secrets), for local dev and Alembic |
| Compose `environment:` | Container-side values |
| `set_envs.sh` | Production container-side values, mainly for deploys and dev with production services |

### CIAM OIDC and admin session

| Variable | Required | Description |
|---|---|---|
| `PRISM_OIDC_ISSUER` | Yes* | `issuer` string from CIAM discovery JSON |
| `PRISM_OIDC_CLIENT_ID` | Yes* | Provided by the WFP CIAM team on client registration |
| `PRISM_OIDC_CLIENT_SECRET` | Yes* | Provided by the WFP CIAM team on client registration |
| `PRISM_OIDC_REDIRECT_URI` | Yes* | Must match the registered redirect URI (shared by CIAM and Entra) |
| `PRISM_SESSION_SECRET` | Prod | See [Session secret](README.md#session-secret-prism_session_secret) in the API README |
| `PRISM_SESSION_TTL_SECONDS` | No | Cookie/session lifetime in seconds (default: `604800` — one week) |
| `PRISM_OIDC_SCOPES` | No | Space-separated scopes (default: `openid profile email`) |
| `PRISM_OIDC_AUTHORIZE_PROMPT` | No | Optional `prompt` param on the CIAM authorize URL |
| `PRISM_OIDC_POST_LOGOUT_REDIRECT_URI` | No | Return URL after OIDC logout; must be registered on each IdP client |
| `PRISM_ACCESS_SUPPORT_EMAIL` | No | Shown on the access-denied page |
| `PRISM_ADMIN_AUTH_DISABLED` | Dev only | Set `true` to bypass OIDC for local development |

\*Required for CIAM sign-in. At least one provider (CIAM and/or Entra) must be fully configured for production auth.

### Microsoft Entra ID (optional second provider)

Entra is **disabled** when `PRISM_ENTRA_OIDC_TENANT_ID` and `PRISM_ENTRA_OIDC_CLIENT_ID` are unset.

| Variable | Required | Description |
|---|---|---|
| `PRISM_ENTRA_OIDC_TENANT_ID` | For Entra | Directory (tenant) ID from the app registration |
| `PRISM_ENTRA_OIDC_CLIENT_ID` | For Entra | Application (client) ID |
| `PRISM_ENTRA_OIDC_CLIENT_SECRET` | Usually | From **Certificates & secrets** on the app registration (see note below) |


### Session API (`/whoami`)

Authenticated clients receive:

```json
{
  "user_id": "<uuid>",
  "auth_provider": "ciam",
  "ciam_sub": "<oidc sub>",
  "email": "user@example.org",
  "permissions": ["prism.admin.access"]
}
```

See [`.env.example`](.env.example) for a ready-to-copy template.

Post-login returns to the React print modal use the same hostname allowlist as map export (`EXPORT_ALLOWED_DOMAINS` in `prism_app/utils.py`), plus localhost.

## Dev Mode

Set `PRISM_ADMIN_AUTH_DISABLED=true` to bypass OIDC entirely for local development. All permission gates are satisfied with the full capability set in this mode.
