/**
 * Run threshold alert-worker and AA listing queries against a real pg pool.
 * Safe on an empty database: no outbound hazard fetches when there are no active alerts.
 */
import { runAlertWorker } from '../alert-worker';
import { closePool } from '../db/pool';
import { findAnticipatoryActionAlerts } from '../db/aa-queries';

async function main(): Promise<void> {
  await findAnticipatoryActionAlerts('Mozambique', 'storm');
  await findAnticipatoryActionAlerts('Mozambique', 'flood');
  await runAlertWorker();
  await closePool();
  console.log('Alerting worker smoke OK (threshold + AA storm/flood queries)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
