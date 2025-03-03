# WFP PRISM Alerting node

This project is part the World Food Programme's [PRISM project](https://innovation.wfp.org/project/prism).
It provides a service called `alerting-node` able to send emails when alerts are triggered.

It comes with a database which persists alerts related data. The database is provided via a docker container. See the service `alerting-db` in the file [docker-compose.yml](./docker-compose.yml)

There is a unique service running for all country specific frontends.

## Functionalities

- for `anticipatory action storm` module
  - check periodically at the latest forecast reports, trigger alerts and send alert emails when necessary.
- ...

## Setup - anticipatory action storm alerts

- Alerts are triggered by a cron job running within the `alerting-node` process.
- Run `docker-compose up` to launch the `alerting-node` and `alerting-db` processes.
- The system checks database entries to determine **which country** needs to be triggered.
- Currently, **only Mozambique is supported**. To add it, connect to the `psql` console of `alerting-db` and run the following command:

```sql
INSERT INTO anticipatory_action_alerts (country, emails, prism_url)
VALUES ('Mozambique', ARRAY['email1@example.com'], 'https://prism.wfp.org');
```

- **country**: The target country for the alert.  
- **emails**: A list of email addresses that will receive the alert notification.  
- **prism_url**: The base URL of the PRISM platform for redirection link and screenshot capture. 

## Test sending emails for anticipatory action storm alerts

Follow these steps to test the email sending functionality for storm alerts:

- Run `docker-compose up` to launch the `alerting-node` and `alerting-db` processes
- Make sure to have at least one entry in the database (See the Setup section for more details)
- Use this command to send test emails :

```bash
 sudo docker-compose run --entrypoint "yarn aa-storm-alert-worker --testEmail='email1@example.com,email2@example.com'" alerting-node 2>&1
 ```