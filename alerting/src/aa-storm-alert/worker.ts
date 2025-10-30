import {
  buildEmailPayloads,
  filterOutAlreadyProcessedReports,
  getLatestAvailableReports,
  transformReportsToLastProcessed,
} from './alert';
import { sendStormAlertEmail } from '../utils/email';
import { runAAWorker } from '../aa-common/runner';

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
  await runAAWorker({
    country: COUNTRY,
    type: 'storm',
    overrideEmails,
    prepare: async () => {
      const latestAvailableReports = await getLatestAvailableReports();
      return { latestAvailableReports };
    },
    buildForAlert: async (alert, context, isTest, emailsOverride) => {
      const lastStates = (isTest ? undefined : alert.lastStates) as unknown as
        | import('../types/storm-reports').LastStates
        | undefined;
      const filteredAvailableReports = filterOutAlreadyProcessedReports(
        context.latestAvailableReports,
        lastStates,
      );
      const emails = isTest ? emailsOverride : alert.emails;
      const payloads = await buildEmailPayloads(
        filteredAvailableReports,
        alert.prismUrl,
        emails,
      );
      const updatedLastStates = transformReportsToLastProcessed(
        context.latestAvailableReports,
      );
      return { payloads, updatedLastStates };
    },
    send: sendStormAlertEmail,
  });
}
