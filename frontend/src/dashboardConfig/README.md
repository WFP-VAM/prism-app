# Dashboard config (`dashboard.json`)

Runtime dashboard configurations are JSON validated by [`schema.ts`](./schema.ts), loaded from S3 or `public/<country>/dashboard.json`. The app always works with a **single canonical type** after parse: `Dashboard[]` (the `rows` list).

`CURRENT_DASHBOARD_SCHEMA_VERSION` in `schema.ts` is the latest supported version number (for code and tests).

## When to bump the schema version

Bump **only** when existing dashboard JSON in the wild would **fail** validation if you tightened the schema (removed or renamed required fields, incompatible type changes, new required top-level shape, etc.).

You **do not** bump for:

- Optional new fields, new optional element properties, or TypeScript-only changes
- Additive changes that keep old payloads valid

If you can stay backward compatible with optional fields and defaults, stay on the same `schemaVersion`.

## Adding a new version (e.g. v2)

1. Introduce a new Zod branch (e.g. `dashboardConfigV2Schema` with `schemaVersion: z.literal(2)`).
2. Replace the single `dashboardConfigV1Schema` in `dashboardConfigRootSchema` with a **`z.discriminatedUnion('schemaVersion', [ v1, v2, … ])`** (and keep the preprocess step that wraps bare arrays as v1 only).
3. Map every branch to the same **`Dashboard[]`** in `validateDashboardConfig` (normalize in `.transform` or after `safeParse`).
4. Add a fixture under `frontend/test/fixtures/` for v2 and tests in `schema.test.ts`.
5. Update this README and [push script](../../../scripts/push-dashboard-config.sh) docs if workflow changes.
6. Upload migrated or new-format data to the **dev** bucket first; confirm production builds still read prod data before promoting.
