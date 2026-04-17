# Historical TypeORM artifacts (read-only)

The alerting service previously used **TypeORM** for PostgreSQL access and migrations.

- **`migration/`** — TypeORM migration files that describe how production schema was built. They are not executed by current tooling.
- **`ormconfig.ts`** — Removed from the tree; connection options are reflected in `src/db/pool.ts` (URL, `POSTGRES_*`, `POSTGRES_SSL`) and in the former config kept in git history if needed.

**Authoritative migrations** for `alert`, `user_info`, and `anticipatory_action_alerts` live under **`api/alembic/`**. See `alerting/README.md` and `api/README.md`.
