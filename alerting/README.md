# WFP PRISM Alerting node

This project is part the World Food Programme's [PRISM project](https://innovation.wfp.org/project/prism).
It provides a service called `alerting-node` able to send emails when alerts are triggered.

It comes with a database which persists alerts related data. The database is provided via a docker container. See the service `alerting-db` in the file [docker-compose.yml](./docker-compose.yml)

There is a unique service running for all country specific frontends.

## Functionalities

- `anticipatory action storm` alerts
  - Checks latest storm forecast reports, decides triggers, sends alert emails when necessary.
- `anticipatory action flood` alerts
  - Reads flood `dates.json` (Mozambique), evaluates `trigger_status` (bankfull/moderate/severe), sends alert emails with a map screenshot.

## Setup - anticipatory action alerts

- Alerts are triggered by a cron job running within the `alerting-node` process.
- Run `docker compose up` to launch the `alerting-node` and `alerting-db` processes.
- The system checks database entries to determine **which country** needs to be triggered.
- Currently, **Mozambique is supported**. To add it, connect to the `psql` console of `alerting-db` and run the following commands:

```sql
-- Storm
INSERT INTO anticipatory_action_alerts (country, emails, prism_url, type)
VALUES ('Mozambique', ARRAY['email1@example.com'], 'https://prism.moz.wfp.org', 'storm');

-- Flood
INSERT INTO anticipatory_action_alerts (country, emails, prism_url, type)
VALUES ('Mozambique', ARRAY['email1@example.com'], 'https://prism.moz.wfp.org', 'flood');
```

- **country**: The target country for the alert.  
- **emails**: A list of email addresses that will receive the alert notification.  
- **prism_url**: The base URL of the PRISM platform for redirection link and screenshot capture.
- **type**: Hazard type enum: `storm` | `flood` | `drought`.

The `type` column is a PostgreSQL ENUM. Migration `1738850000000-add-type-to-anticipatory-action-alerts.ts` creates it.

### Shared worker runner

Both storm and flood workers use a shared runner at `src/aa-common/runner.ts` to handle:
- DB connection, alert lookup by `country` and `type`, and test override wiring
- A `prepare` hook to fetch shared data once per run
- A `buildForAlert` hook to create email payloads and updated `lastStates` per alert row
- Sending payloads and updating `lastRanAt`/`lastTriggeredAt`/`lastStates`

Hazard-specific logic lives in:
- Storm: `src/aa-storm-alert/alert.ts` and `src/aa-storm-alert/worker.ts`
- Flood: `src/aa-flood-alert/alert.ts` and `src/aa-flood-alert/worker.ts`

## Test sending emails

Follow these steps to test the email sending functionality for storm alerts:

- Run `docker compose up` to launch the `alerting-node` and `alerting-db` processes
- Make sure to have at least one entry in the database (See the Setup section for more details)
- Use this command to send test emails :

```bash
# Storm
sudo docker compose run --entrypoint "yarn aa-storm-alert-worker --testEmail='email1@example.com,email2@example.com'" alerting-node

# Flood
sudo docker compose run --entrypoint "yarn aa-flood-alert-worker --testEmail='email1@example.com,email2@example.com'" alerting-node
```
- The provided emails replace the DB-configured recipients for test runs.

### Flood data source
- The flood worker reads `dates.json`: `https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json`.
- Email triggers when `trigger_status` is one of: `bankfull`, `moderate`, `severe`.
- Email content follows the AA Flood design and includes a map screenshot and CTA link.

## Server crons
Alert workers are running as crons on the server. Edit with: `crontab -e`
Crontab examples :
```
0 * * * *  ~/prism-app/alerting/crons/cron_aa_storm_alert_run.sh
5 * * * *  ~/prism-app/alerting/crons/cron_aa_flood_alert_run.sh
0 1 * * *  ~/prism-app/alerting/crons/cron_alert_run.sh
```
