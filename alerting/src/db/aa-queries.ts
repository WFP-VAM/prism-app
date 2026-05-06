import { getPool } from './pool';
import { mapAnticipatoryActionAlertRow } from './row-mappers';
import type {
  AnticipatoryActionAlert,
  AnticipatoryActionHazardType,
} from '../types/anticipatory-action-alerts';

export async function findAnticipatoryActionAlerts(
  country: string,
  type: AnticipatoryActionHazardType,
): Promise<AnticipatoryActionAlert[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT
      id,
      country,
      type::text AS type,
      emails,
      prism_url,
      last_triggered_at,
      last_ran_at,
      last_states
    FROM anticipatory_action_alerts
    WHERE country ILIKE $1 AND type = $2`,
    [country, type],
  );
  return res.rows.map((row) =>
    mapAnticipatoryActionAlertRow(row as Record<string, unknown>),
  );
}

export async function updateAnticipatoryActionAlert(
  id: number,
  args: {
    lastStates: Record<string, { status: string; refTime: string }>;
    lastRanAt: Date;
    lastTriggeredAt: Date | null;
  },
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE anticipatory_action_alerts
     SET last_states = $2::jsonb,
         last_ran_at = $3,
         last_triggered_at = COALESCE($4::timestamptz, last_triggered_at)
     WHERE id = $1`,
    [
      id,
      JSON.stringify(args.lastStates),
      args.lastRanAt,
      args.lastTriggeredAt,
    ],
  );
}
