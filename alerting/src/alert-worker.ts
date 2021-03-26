import { createConnection } from 'typeorm';
import { Alert } from './entities/alerts.entity';
import { calculateBoundsForAlert } from './utils/analysis-utils';
import { getWCSCoverage, getWMSCapabilities } from './utils/server-utils';

async function run() {
  const connection = await createConnection();
  const alertRepository = connection.getRepository(Alert);

  const alerts = await alertRepository.find();
  await Promise.all(
    alerts.map(async (alert) => {
      const { baseUrl, serverLayerName, type } = alert.alertConfig;
      const { lastTriggered } = alert;
      const availableDates =
        type === 'wms'
          ? await getWMSCapabilities(`${baseUrl}/wms`)
          : await getWCSCoverage(`${baseUrl}`);
      const layerAvailableDates = availableDates[serverLayerName];
      const maxDate = new Date(Math.max(...layerAvailableDates));

      if (lastTriggered >= maxDate) {
        return;
      }

      const alertMessage = await calculateBoundsForAlert(maxDate, alert);
      if (!alertMessage) {
        return;
      }
      console.log(
        `Your alert '${alert.alertName}' was triggered on ${maxDate}`,
      );
      // TODO - Send an email
      // TODO - update
      console.log(alertMessage);
    }),
  );
}

run();
