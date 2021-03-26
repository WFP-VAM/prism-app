import { createConnection } from 'typeorm';
import { Alert } from './entities/alerts.entity';
import { calculateBoundsForAlert } from './utils/analysis-utils';
import { sendEmail } from './utils/email';
import { getWCSCoverage, getWMSCapabilities } from './utils/server-utils';

async function run() {
  const connection = await createConnection();
  const alertRepository = connection.getRepository(Alert);

  const alerts = await alertRepository.find();
  await Promise.all(
    alerts.map(async (alert) => {
      const { baseUrl, serverLayerName, type } = alert.alertConfig;
      const { email, alertName, lastTriggered } = alert;
      const availableDates =
        type === 'wms'
          ? await getWMSCapabilities(`${baseUrl}/wms`)
          : await getWCSCoverage(`${baseUrl}`);
      const layerAvailableDates = availableDates[serverLayerName];
      const maxDate = new Date(Math.max(...layerAvailableDates));

      if (!maxDate || lastTriggered >= maxDate) {
        return;
      }

      const alertMessage = await calculateBoundsForAlert(maxDate, alert);

      const emailMessage = `
      Your alert${alertName ? ` ${alertName}` : ''} has been triggered.
      Go to the PRISM_LINK for more information.

      Alert: ${alertMessage}`;

      if (alertMessage) {
        console.log(
          `Your alert '${alert.alertName}' was triggered on ${maxDate}`,
        );
        // TODO - Send an email
        sendEmail({
          from: 'prism-alert@ovio.org',
          to: email,
          subject: `PRISM Alert Triggered`,
          text: emailMessage,
        });

        console.log(alertMessage);
      }
      // Update lastTriggered (imnactive during testing)
      alertRepository.update(alert.id, { lastTriggered: maxDate });
    }),
  );
}

run();
