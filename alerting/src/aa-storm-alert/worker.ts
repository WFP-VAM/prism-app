import { createConnection } from 'typeorm';
import { AnticipatoryActionAlerts } from '../entities/anticipatoryActionAlerts';
import {
  buildEmailPayloads,
  filterOutAlreadyProcessedReports,
  getLatestAvailableReports,
  transformReportsToLastProcessed,
} from './alert';
import { sendStormAlertEmail } from '../utils/email';

// TODO: for later, we need to support multiple countries
export const COUNTRY = 'mozambique';

export async function run() {
  // create a connection to the remote db
  const connection = await createConnection();
  const alertRepository = connection.getRepository(AnticipatoryActionAlerts);

  const latestAvailableReports = await getLatestAvailableReports();

  // get the last alert which has been processed for email alert system
  const alert = await alertRepository.findOne({
    where: { country: COUNTRY },
  });

  if (!alert) {
    console.error('Error, no alert was found for the country', COUNTRY);
    return;
  }
  // filter reports which have been already processed
  const lastStates = alert.lastStates;
  const filteredAvailableReports = filterOutAlreadyProcessedReports(
    latestAvailableReports,
    lastStates,
  );

  const basicPrismUrl = alert.prismUrl;
  const emails = alert.emails;

  // check whether an email should be sent
  const emailPayloads = await buildEmailPayloads(
    filteredAvailableReports,
    basicPrismUrl,
    emails,
  );

  console.log('emailPayload', emailPayloads);

  // send emails
  await Promise.all(
    emailPayloads.map((emailPayload) => sendStormAlertEmail(emailPayload)),
  );

  // format last states object
  const updatedLastStates = transformReportsToLastProcessed(
    latestAvailableReports,
  );

  // Update the country last processed reports
  await alertRepository.update(
    { country: COUNTRY },
    {
      lastStates: updatedLastStates,
      ...(emailPayloads.length > 0 ? { lastTriggeredAt: new Date() } : {}),
    },
  );
}
