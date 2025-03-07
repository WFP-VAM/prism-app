import { createConnection } from 'typeorm';
import { AnticipatoryActionAlerts } from '../entities/anticipatoryActionAlerts.entity';
import {
  buildEmailPayloads,
  filterOutAlreadyProcessedReports,
  getLatestAvailableReports,
  transformReportsToLastProcessed,
} from './alert';
import { sendStormAlertEmail } from '../utils/email';
import { ILike } from 'typeorm';

const args = process.argv.slice(2);
const testEmailArg = args.find((arg) => arg.startsWith('--testEmail='));

const overrideEmails: string[] = testEmailArg
  ? testEmailArg
      .split('=')[1]
      ?.split(',')
      .map((email) => email.trim())
      .filter(Boolean)
  : [];

const IS_TEST = overrideEmails.length > 0;

if (IS_TEST) {
  console.log('Running in test mode.');
  console.log('Emails:', overrideEmails);
}

// TODO: for later, we need to support multiple countries
export const COUNTRY = 'mozambique';

/**
 * Executes the process to handle anticipatory action alerts.
 * This script connects to a remote database, retrieves the latest available reports,
 * filters out already processed reports, prepares email payloads based on alerts,
 * sends email alerts, and updates the last processed states in the database.
 *
 * @returns {Promise<void>} Promise that resolves when all operations are completed.
 *
 * @throws {Error} If no alert is found for the specified country in the database.
 */
export async function run() {
  let alerts;
  let connection;
  let alertRepository;

  if (IS_TEST) {
    // TODO - replace with a more stable URL
    const prismUrl = 'https://prism-1420.surge.sh';
    console.log(
      `Test mode: Using fake Mozambique alert with prismUrl: ${prismUrl}`,
    );
    alerts = [
      {
        id: 1,
        country: COUNTRY,
        emails: overrideEmails,
        prismUrl,
        lastStates: undefined,
      },
    ];
  } else {
    // create a connection to the remote db
    connection = await createConnection();
    alertRepository = connection.getRepository(AnticipatoryActionAlerts);

    // get the last alert which has been processed for email alert system
    alerts = await alertRepository.find({
      where: { country: ILike(COUNTRY) },
    });
  }

  if (alerts.length === 0) {
    console.error(`Error: No alert found for ${COUNTRY}`);
    return;
  }

  const latestAvailableReports = await getLatestAvailableReports();

  for (const alert of alerts) {
    // filter reports which have been already processed
    const lastStates = IS_TEST ? undefined : alert.lastStates;
    const filteredAvailableReports = filterOutAlreadyProcessedReports(
      latestAvailableReports,
      lastStates,
    );

    const basicPrismUrl = alert.prismUrl;

    const emails = IS_TEST ? overrideEmails : alert.emails;

    // check whether an email should be sent
    const emailPayloads = await buildEmailPayloads(
      filteredAvailableReports,
      basicPrismUrl,
      emails,
    );

    // send emails
    await Promise.all(
      emailPayloads.map((emailPayload) => sendStormAlertEmail(emailPayload)),
    );

    // format last states object
    const updatedLastStates = transformReportsToLastProcessed(
      latestAvailableReports,
    );

    if (!IS_TEST && alertRepository) {
      // Update the country last processed reports
      await alertRepository.update(
        { id: alert.id, country: COUNTRY },
        {
          lastStates: updatedLastStates,
          lastRanAt: new Date(),
          ...(emailPayloads.length > 0 ? { lastTriggeredAt: new Date() } : {}),
        },
      );
    }
  }

  if (connection) {
    await connection.close();
  }
}
