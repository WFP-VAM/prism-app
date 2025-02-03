import { createConnection } from 'typeorm';
import { AnticipatoryActionAlerts } from '../entities/anticipatoryActionAlerts';
import { StormAlertData } from '../types/email';
import {
  buildEmailPayloads,
  filterAlreadyProcessedReports,
  getLatestAvailableReports,
} from './alert';
import { sendStormAlertEmail } from '../utils/email';

// // Replace with real function when available
// function sendStormAlertEmail(data: StormAlertData) {
//   //nothing yet
// }

export async function run() {
  // create a connection to the remote db
  const connection = await createConnection();
  const latestStormReportsRepository =
    connection.getRepository(AnticipatoryActionAlerts);

  const latestAvailableReports = await getLatestAvailableReports();

  // filter reports which have been already processed

  const filteredAvailableReports = await filterAlreadyProcessedReports(
    latestAvailableReports,
    latestStormReportsRepository,
  );

  // check whether an email should be sent
  const emailPayloads = await buildEmailPayloads(filteredAvailableReports);

  console.log('emailPayload', emailPayloads);

  // send emails
  await Promise.all(
    emailPayloads.map((emailPayload) => sendStormAlertEmail(emailPayload)),
  );

  // drop all latest storm reports stored to prevent accumulation of useless data in this table by time
  await latestStormReportsRepository.clear();
  await latestStormReportsRepository.save(
    latestAvailableReports.map((report) => ({ reportIdentifier: report.path })),
  );
}
