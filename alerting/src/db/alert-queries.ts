import { getPool } from './pool';
import { mapAlertRow } from './row-mappers';
import type { Alert } from '../types/alert';

export async function findActiveAlerts(): Promise<Alert[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT
      id,
      email,
      prism_url,
      alert_name,
      alert_config,
      min,
      max,
      zones,
      active,
      created_at,
      updated_at,
      last_triggered
    FROM alert
    WHERE active = true`,
  );
  return res.rows.map((row) => mapAlertRow(row as Record<string, unknown>));
}

export async function updateAlertLastTriggered(
  id: number,
  lastTriggered: Date,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE alert SET last_triggered = $1 WHERE id = $2`,
    [lastTriggered, id],
  );
}
