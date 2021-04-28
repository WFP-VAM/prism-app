import { isNaN } from 'lodash';
import { createConnection, Repository } from 'typeorm';
import { Alert } from './entities/alerts.entity';
import { calculateBoundsForAlert } from './utils/analysis-utils';
import { sendEmail } from './utils/email';
import { getWCSCoverage, getWMSCapabilities } from './utils/server-utils';

async function processAlert(alert: Alert, alertRepository: Repository<Alert>) {
  const { baseUrl, serverLayerName, type } = alert.alertConfig;
  const { id, alertName, createdAt, email, lastTriggered, prismUrl } = alert;
  const availableDates =
    type === 'wms'
      ? await getWMSCapabilities(`${baseUrl}/wms`)
      : await getWCSCoverage(`${baseUrl}`);
  const layerAvailableDates = availableDates[serverLayerName];
  const maxDate = new Date(Math.max(...(layerAvailableDates || [])));

  if (
    isNaN(maxDate.getTime()) ||
    (lastTriggered && lastTriggered >= maxDate) ||
    createdAt >= maxDate
  ) {
    return;
  }

  const alertMessage = await calculateBoundsForAlert(maxDate, alert);

  if (alertMessage) {
    const emailMessage = `
        Your alert${alertName ? ` ${alertName}` : ''} has been triggered.

        Layer: ${serverLayerName}
        Date: ${maxDate}

        Go to ${prismUrl} for more information.
  
        Alert: ${alertMessage}`;

    console.log(
      `Alert ${id} - '${alert.alertName}' was triggered on ${maxDate}.`,
    );
    // TODO - Send an email using WFP SMTP servers.
    await sendEmail({
      from: 'prism-alert@ovio.org',
      to: email,
      subject: `PRISM Alert Triggered`,
      text: emailMessage,
    });

    console.log(alertMessage);
  }
  // Update lastTriggered (imnactive during testing)
  await alertRepository.update(alert.id, { lastTriggered: maxDate });
}
async function run() {
  const connection = await createConnection();
  const alertRepository = connection.getRepository(Alert);

  const alerts = await alertRepository.find();
  console.info(`Processing ${alerts.length} alerts.`);

  await Promise.all(
    alerts.map(async (alert) => processAlert(alert, alertRepository)),
  );
}

run();
