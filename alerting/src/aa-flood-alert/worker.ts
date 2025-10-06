import { createConnection, ILike } from 'typeorm';
import { AnticipatoryActionAlerts } from '../entities/anticipatoryActionAlerts.entity';
import {
  fetchFloodDatesJson,
  getLatestFloodDate,
  buildFloodEmailPayload,
  transformLastProcessedFlood,
} from './alert';
import { sendFloodAlertEmail } from '../utils/email';

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
export const COUNTRY = 'mozambique';

export async function run() {
  let alerts: Array<
    Pick<
      AnticipatoryActionAlerts,
      'id' | 'country' | 'emails' | 'prismUrl' | 'lastStates'
    >
  >;
  let connection;
  let alertRepository;

  if (IS_TEST) {
    const prismUrl = 'https://prism.moz.wfp.org/';
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
    connection = await createConnection();
    alertRepository = connection.getRepository(AnticipatoryActionAlerts);
    alerts = await alertRepository.find({
      where: { country: ILike(COUNTRY), type: 'flood' },
    });
  }

  if (alerts.length === 0) {
    console.error(`Error: No flood alert config found for ${COUNTRY}`);
    if (connection) await connection.close();
    return;
  }

  // Use the same dates.json endpoint as frontend config
  const datesUrl =
    'https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json';
  const dates = await fetchFloodDatesJson(datesUrl);
  const latestDate = getLatestFloodDate(dates);
  if (!latestDate) {
    console.log('No flood dates available');
    if (connection) await connection.close();
    return;
  }

  const triggerStatus = dates[latestDate]?.trigger_status;

  for (const alert of alerts) {
    const basicPrismUrl = alert.prismUrl;
    const emails = IS_TEST ? overrideEmails : alert.emails;

    const payload = await buildFloodEmailPayload(
      latestDate,
      triggerStatus || '',
      basicPrismUrl,
      emails,
    );
    if (payload) {
      await sendFloodAlertEmail(payload);
    }

    const updatedLastStates = transformLastProcessedFlood(
      latestDate,
      triggerStatus || '',
    );

    if (!IS_TEST && alertRepository) {
      await alertRepository.update(
        { id: alert.id },
        {
          lastStates: updatedLastStates,
          lastRanAt: new Date(),
          ...(payload ? { lastTriggeredAt: new Date() } : {}),
        },
      );
    }
  }

  if (connection) {
    await connection.close();
  }
}
