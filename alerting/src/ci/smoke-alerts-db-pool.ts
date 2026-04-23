/**
 * Opens a real pg pool and runs the same queries alerting uses for thresholds
 * and AA workers. Validates migrations + SQL paths (empty tables OK).
 */
import { closePool } from '../db/pool';
import { findActiveAlerts } from '../db/alert-queries';
import { findAnticipatoryActionAlerts } from '../db/aa-queries';

async function main(): Promise<void> {
  const alerts = await findActiveAlerts();
  if (!Array.isArray(alerts)) {
    throw new Error('findActiveAlerts must return an array');
  }

  const aa = await findAnticipatoryActionAlerts('Mozambique', 'storm');
  if (!Array.isArray(aa)) {
    throw new Error('findAnticipatoryActionAlerts must return an array');
  }

  await closePool();
  console.log(
    `Alerts DB smoke OK (${alerts.length} active alerts, ${aa.length} AA storm rows for Mozambique)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
