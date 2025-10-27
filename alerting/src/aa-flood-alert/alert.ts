import nodeFetch from 'node-fetch';
import { captureScreenshotFromUrl } from '../utils/capture-utils';
import { formatDate } from '../utils/date';
import { FloodAlertEmailData } from '../types/flood-email';

// @ts-ignore
global.fetch = nodeFetch;

type DatesJsonEntry = {
  trigger_status?: 'bankfull' | 'moderate' | 'severe' | string;
  probabilities_file?: string;
  discharge_file?: string;
  avg_probabilities_file?: string;
};

export async function fetchFloodDatesJson(
  url: string,
): Promise<Record<string, DatesJsonEntry>> {
  try {
    const resp = await fetch(url);
    return await resp.json();
  } catch (e) {
    console.error('Error fetching flood dates.json', e);
    return {} as Record<string, DatesJsonEntry>;
  }
}

export function getLatestFloodDate(
  dates: Record<string, DatesJsonEntry>,
): string | null {
  const dateKeys = Object.keys(dates || {});
  if (!dateKeys.length) return null;
  return dateKeys.reduce((latest, current) =>
    new Date(current) > new Date(latest) ? current : latest,
  );
}

export function shouldSendFloodEmail(trigger?: string): boolean {
  if (!trigger) return false;
  // TODO: remove "not exceeded" once we have a proper trigger status
  const warningLevels = ['not exceeded', 'bankfull', 'moderate', 'severe'];
  return warningLevels.includes(trigger.toLowerCase());
}

export function transformLastProcessedFlood(
  date: string,
  trigger: string,
): Record<string, { status: string; refTime: string }> {
  // key by flood for moz we use single-key tracking by date
  return {
    moz_flood: { status: trigger, refTime: date },
  };
}

export function buildFloodPrismUrl(basicUrl: string, dateIso: string) {
  const reportDate = formatDate(dateIso, 'YYYY-MM-DD');
  return new URL(
    `?hazardLayerIds=anticipatory_action_flood&date=${reportDate}`,
    basicUrl,
  ).toString();
}

export async function buildFloodEmailPayload(
  dateIso: string,
  triggerStatus: string,
  basicPrismUrl: string,
  emails: string[],
): Promise<FloodAlertEmailData | null> {
  if (!shouldSendFloodEmail(triggerStatus)) return null;

  const redirectUrl = buildFloodPrismUrl(basicPrismUrl, dateIso);
  const base64Image = await captureScreenshotFromUrl({
    url: redirectUrl,
    elementsToHide: ['.MuiDrawer-root', '.MuiList-root', '.MuiGrid-root'],
    crop: { x: 900, y: 200, width: 1000, height: 800 },
  });

  const title = `Flood trigger activated: ${triggerStatus.toUpperCase()}`;

  return {
    email: emails,
    title,
    triggerStatus,
    date: dateIso,
    redirectUrl,
    base64Image,
  };
}
