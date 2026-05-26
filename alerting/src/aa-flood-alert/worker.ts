import {
  fetchFloodDatesJson,
  getLatestFloodDate,
  buildFloodEmailPayload,
  transformLastProcessedFlood,
} from './alert';
import { sendFloodAlertEmail } from '../utils/email';
import { runAAWorker } from '../aa-common/runner';
import { TriggerStatus } from '../types/flood-email';

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
      const emails = isTest ? emailsOverride : alert.emails;

      // Avoid sending duplicates: compare last processed date with latest available date
      const lastProcessedRefTime =
        !isTest && alert.lastStates
          ? alert.lastStates['moz_flood']?.refTime
          : undefined;
      const isNewDate =
        !lastProcessedRefTime ||
        new Date(context.latestDate) > new Date(lastProcessedRefTime);
      if (!isNewDate) {
        return { payloads: [], updatedLastStates: alert.lastStates || {} };
      }

      // Get station summary URL from dates data
      const stationSummaryFile =
        context.dates[context.latestDate]?.station_summary_file;
      const stationSummaryUrl = stationSummaryFile
        ? `https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/${stationSummaryFile}`
        : undefined;

      const payload = await buildFloodEmailPayload(
        context.latestDate,
        context.triggerStatus || ('not exceeded' as TriggerStatus),
        alert.prismUrl,
        emails,
        stationSummaryUrl,
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
