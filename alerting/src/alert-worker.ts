import { isNaN } from 'lodash';
import Bluebird from 'bluebird';
import nodeFetch from 'node-fetch';
import { createConnection, Repository } from 'typeorm';
import { ANALYSIS_API_URL } from './constants';
import { Alert } from './entities/alerts.entity';
import { calculateBoundsForAlert } from './utils/analysis-utils';
import { sendEmail } from './utils/email';
import { fetchCoverageLayerDays, formatUrl, WMS } from 'prism-common';

// @ts-ignore
global.fetch = nodeFetch;

async function processAlert(alert: Alert, alertRepository: Repository<Alert>) {
  const {
    baseUrl,
    serverLayerName,
    type,
    title,
    id: hazardLayerId,
  } = alert.alertConfig;
  const {
    id,
    alertName,
    createdAt,
    email,
    lastTriggered,
    prismUrl,
    active,
  } = alert;

  let availableDates;
  let layerAvailableDates = [];
  try {
    availableDates = type === 'wms'
      ? await new WMS(`${baseUrl}/wms`.replace(/([^:]\/)\/+/g, "$1")).getLayerDays()
      : await fetchCoverageLayerDays(baseUrl);
    layerAvailableDates = availableDates[serverLayerName];
  } catch (error) {
    console.warn(`Failed to fetch available dates for ${baseUrl} ${serverLayerName}: ${(error as Error).message}`);
  }

  if (!layerAvailableDates) {
    console.warn(`No dates available for ${baseUrl} ${serverLayerName}.`);
    return;
  }

  const maxDate = new Date(Math.max(...(layerAvailableDates || [])));

  if (
    isNaN(maxDate.getTime()) ||
    (lastTriggered && lastTriggered >= maxDate) ||
    createdAt >= maxDate
  ) {
    return;
  }

  const alertMessage = await calculateBoundsForAlert(maxDate, alert);

  // Use the URL API to create the url and perform url encoding on all character
  const url = new URL(`/alerts/${id}`, ANALYSIS_API_URL);
  url.searchParams.append('deactivate', 'true');
  url.searchParams.append('email', email);

  const urlWithParams = formatUrl(prismUrl, {
    hazardLayerIds: hazardLayerId,
    date: maxDate.toISOString().slice(0, 10),
  });

  if (alertMessage) {
    const emailMessage = `
        Your alert${alertName ? ` ${alertName}` : ''} has been triggered.

        Layer: ${serverLayerName}
        Date: ${maxDate}

        Go to ${urlWithParams} for more information.
  
        Alert: ${alertMessage}`;

    const emailHtml = `${emailMessage
      .replace(/(\r\n|\r|\n)/g, '<br>')
      .replace(
        urlWithParams,
        `<a href="${urlWithParams}">${title}</a>`,
      )} <br><br>To cancel this alert, click <a href='${url.href}'>here</a>.`;

    console.log(
      `Alert ${id} - '${alert.alertName}' was triggered on ${maxDate}.`,
    );
    // TODO - Send an email using WFP SMTP servers.
    await sendEmail({
      from: 'prism-alert@ovio.org',
      to: email,
      subject: `PRISM Alert Triggered`,
      text: emailMessage,
      html: emailHtml,
    });

    console.log(alertMessage);
  }
  // Update lastTriggered (imnactive during testing)
  await alertRepository.update(alert.id, { lastTriggered: maxDate });
}
async function run() {
  const connection = await createConnection();
  const alertRepository = connection.getRepository(Alert);

  const alerts = await alertRepository.find({ where: { active: true } });
  console.info(`Processing ${alerts.length} active alerts.`);

  await Bluebird.map(
    alerts,
    async (alert) => {
      try {
        await processAlert(alert, alertRepository);
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
      }
    },
    { concurrency: 5 },
  );
}

run();
