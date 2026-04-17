/**
 * Asserts public schema objects required by alerting SQL (alert-queries,
 * aa-queries) exist after Alembic migrations. Run with PRISM_ALERTS_DATABASE_URL.
 */
import { getPool, closePool } from '../db/pool';

type PgColumn = { column_name: string; data_type: string; udt_name: string };

const ALERT_COLUMNS: Record<string, { data_type: string; udt_name: string }> = {
  id: { data_type: 'integer', udt_name: 'int4' },
  email: { data_type: 'character varying', udt_name: 'varchar' },
  prism_url: { data_type: 'character varying', udt_name: 'varchar' },
  alert_name: { data_type: 'character varying', udt_name: 'varchar' },
  alert_config: { data_type: 'jsonb', udt_name: 'jsonb' },
  min: { data_type: 'integer', udt_name: 'int4' },
  max: { data_type: 'integer', udt_name: 'int4' },
  zones: { data_type: 'jsonb', udt_name: 'jsonb' },
  active: { data_type: 'boolean', udt_name: 'bool' },
  created_at: { data_type: 'timestamp without time zone', udt_name: 'timestamp' },
  updated_at: { data_type: 'timestamp without time zone', udt_name: 'timestamp' },
  last_triggered: {
    data_type: 'timestamp without time zone',
    udt_name: 'timestamp',
  },
};

const AA_COLUMNS: Record<string, { data_type: string; udt_name: string }> = {
  id: { data_type: 'integer', udt_name: 'int4' },
  country: { data_type: 'character varying', udt_name: 'varchar' },
  type: { data_type: 'USER-DEFINED', udt_name: 'anticipatory_action_alerts_type_enum' },
  emails: { data_type: 'ARRAY', udt_name: '_varchar' },
  prism_url: { data_type: 'character varying', udt_name: 'varchar' },
  last_triggered_at: {
    data_type: 'timestamp with time zone',
    udt_name: 'timestamptz',
  },
  last_ran_at: { data_type: 'timestamp with time zone', udt_name: 'timestamptz' },
  last_states: { data_type: 'jsonb', udt_name: 'jsonb' },
};

function checkTable(
  table: string,
  rows: PgColumn[],
  expected: Record<string, { data_type: string; udt_name: string }>,
): string[] {
  const errors: string[] = [];
  const byName = new Map(rows.map((r) => [r.column_name, r]));
  for (const [col, spec] of Object.entries(expected)) {
    const row = byName.get(col);
    if (!row) {
      errors.push(`${table}: missing column ${col}`);
      continue;
    }
    if (row.data_type !== spec.data_type || row.udt_name !== spec.udt_name) {
      errors.push(
        `${table}.${col}: expected data_type=${spec.data_type} udt=${spec.udt_name}, got data_type=${row.data_type} udt=${row.udt_name}`,
      );
    }
  }
  return errors;
}

async function main(): Promise<void> {
  const pool = getPool();
  const errors: string[] = [];

  const enumRes = await pool.query(
    `SELECT 1 FROM pg_type WHERE typname = 'anticipatory_action_alerts_type_enum'`,
  );
  if ((enumRes.rowCount ?? 0) === 0) {
    errors.push('Missing enum type anticipatory_action_alerts_type_enum');
  }

  for (const tbl of ['alert', 'anticipatory_action_alerts']) {
    const res = await pool.query<PgColumn>(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tbl],
    );
    if ((res.rowCount ?? 0) === 0) {
      errors.push(`Missing table ${tbl}`);
      continue;
    }
    const spec = tbl === 'alert' ? ALERT_COLUMNS : AA_COLUMNS;
    errors.push(...checkTable(tbl, res.rows, spec));
  }

  await closePool();

  if (errors.length) {
    console.error('Alerts DB contract check failed:\n', errors.join('\n'));
    process.exit(1);
  }
  console.log('Alerts DB contract OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
