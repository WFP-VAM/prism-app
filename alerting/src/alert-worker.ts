import { createConnection } from 'typeorm';
import { Alert } from './entities/alerts.entity';
import { calculateBoundsForAlert } from './utils/analysis-utils';
import { getWMSCapabilities } from './utils/server-utils';

async function run() {
  const connection = await createConnection();
  const alertRepository = connection.getRepository(Alert);

  const alerts = await alertRepository.find();
  await Promise.all(
    alerts.map(async (alert) => {
      const { baseUrl, serverLayerName } = alert.alertConfig;
      const availableDates = await getWMSCapabilities(`${baseUrl}/wms`);
      const layerAvailableDates = availableDates[serverLayerName];
      const maxDate = new Date(Math.max(...layerAvailableDates));
      console.log(maxDate);
      const alertMessage = await calculateBoundsForAlert(maxDate, alert);
      console.log(alertMessage);
    }),
  );
}

run();
