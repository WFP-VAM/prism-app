import {
  fetchFloodDatesJson,
  getLatestFloodDate,
  buildFloodEmailPayload,
  transformLastProcessedFlood,
} from './alert';
import { sendFloodAlertEmail } from '../utils/email';
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

export const COUNTRY = 'mozambique';

export async function run() {
  await runAAWorker({
    country: COUNTRY,
    type: 'flood',
    overrideEmails,
    prepare: async () => {
      const datesUrl =
        'https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json';
      const dates = await fetchFloodDatesJson(datesUrl);
      const latestDate = getLatestFloodDate(dates);
      const triggerStatus = latestDate
        ? dates[latestDate]?.trigger_status
        : null;
      return { dates, latestDate, triggerStatus };
    },
    buildForAlert: async (alert, context, isTest, emailsOverride) => {
      if (!context.latestDate) {
        return { payloads: [], updatedLastStates: alert.lastStates || {} };
      }
      console.log('context', context);
      console.log('alert', alert);
      const emails = isTest ? emailsOverride : alert.emails;
      const payload = await buildFloodEmailPayload(
        context.latestDate,
        context.triggerStatus || '',
        alert.prismUrl,
        emails,
      );
      const updatedLastStates = transformLastProcessedFlood(
        context.latestDate,
        context.triggerStatus || '',
      );
      return { payloads: payload ? [payload] : [], updatedLastStates };
    },
    send: sendFloodAlertEmail,
  });
}
