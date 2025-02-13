import {
  LastStates,
  ShortReport,
  ShortReportsResponseBody,
} from '../types/aa-storm-email';
import nodeFetch from 'node-fetch';
import { WindState } from 'prism-common/dist/types/anticipatory-action-storm/windState';
import { StormDataResponseBody } from 'prism-common/dist/types/anticipatory-action-storm/reportResponse';
import { StormAlertData } from '../types/email';
import moment from 'moment';
import { captureScreenshotFromUrl } from '../utils/capture-utils';

// @ts-ignore
global.fetch = nodeFetch;

function fetchAllReports(): Promise<ShortReportsResponseBody | null> {
  return fetch(
    'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/dates.json',
  )
    .then((data) => data.json())
    .catch(() => {
      console.error('Error fetching all reports');
      return null;
    });
}

// fetch and extract the more recent short report for each reported storm
export async function getLatestAvailableReports() {
  // fetch all reports
  const allReports = await fetchAllReports();

  if (!allReports) {
    return [];
  }

  // filter latest reports for all storms using day
  const latestReportsDate = Object.keys(allReports).reduce(
    (latestDateReports, currentDateReports) =>
      new Date(currentDateReports) > new Date(latestDateReports)
        ? currentDateReports
        : latestDateReports,
  );

  const latestDayReports = allReports[latestReportsDate];

  // for each storm of the last day, keep only the latest report by time

  return Object.keys(latestDayReports).map((stormName) => {
    const stormShortReports = latestDayReports[stormName];

    // get the latest report for that storm
    const latestReport = stormShortReports.reduce(
      (latestShortReport, currentShortReport) =>
        new Date(currentShortReport.ref_time) >
        new Date(latestShortReport.ref_time)
          ? currentShortReport
          : latestShortReport,
    );
    return latestReport;
  });
}

export function filterOutAlreadyProcessedReports(
  availableReports: ShortReport[],
  lastStates?: LastStates,
) {
  if (!lastStates) {
    return availableReports;
  }

  return availableReports.filter((availableReport) => {
    const stormName = availableReport.path.split('/')[0];
    const refTime = new Date(availableReport.ref_time);

    const lastProcessed = lastStates[stormName];

    // Get the new report if the report is newer
    return !lastProcessed || new Date(lastProcessed.refTime) < refTime;
  });
}

export function transformReportsToLastProcessed(
  reports: ShortReport[],
): LastStates {
  const lastProcessedReports: LastStates = {};

  reports.forEach((report) => {
    const stormName = report.path.split('/')[0];
    lastProcessedReports[stormName] = {
      refTime: report.ref_time,
      status: report.state,
    };
  });

  return lastProcessedReports;
}

function getActivatedDistricts(report: StormDataResponseBody): {
  activated48kt: string[],
  activated64kt: string[],
} {

  const watchedDistrictsFor64KtStorm = [
    'Mogincual',
    'Namacurra',
    'Cidade Da Beira',
    'Buzi',
    'Dondo',
    'Vilankulo',
  ];

  const watchedDistrictsFor48ktStorm = [
    'Angoche',
    'Maganja Da Costa',
    'Machanga',
    'Govuro',
  ];

  const activated64kt =  report.ready_set_results?.exposed_area_64kt?.affected_districts.filter((district) =>
    watchedDistrictsFor64KtStorm.includes(district),
  )

  const activated48kt =  report.ready_set_results?.exposed_area_48kt?.affected_districts.filter((district) =>
    watchedDistrictsFor48ktStorm.includes(district),
  )

  return {
    activated48kt: activated48kt || [],
    activated64kt: activated64kt || [],
  }
}

function hasLandfallOccured(report: StormDataResponseBody): boolean {
  const landfallInfo = report.landfall_info;
  if ('landfall_time' in landfallInfo) {
    const landfallOutermostTime = landfallInfo.landfall_time[1];
    return moment().isAfter(moment(landfallOutermostTime));
  }
  return false;
}

function shouldSendEmail(status: WindState, activated48kt: string[], activated64kt: string[], pastLandfall: boolean): boolean {
  const hasActivated = (status === WindState.activated_64kt || status === WindState.activated_48kt)
    && (activated48kt.length > 0 || activated64kt.length > 0);
  
  const isReady = status === WindState.ready;
  return !pastLandfall && (hasActivated || isReady);
}

/**
 * Build the url which enables to visualize the relevant storm data on the map. THis email is used in the email alert.
 * @param date date of the report
 */
function buildPrismUrl(basicUrl: string, date: string) {
  const reportDate = moment(date).format('YYYY-MM-DD');
  return `${basicUrl}/?hazardLayerIds=anticipatory_action_storm&date=${reportDate}`;
}

export async function buildEmailPayloads(
  shortReports: ShortReport[],
  basicPrismUrl: string,
  emails: string[],
): Promise<StormAlertData[]> {
  try {
    const emailPayload = await Promise.all(
      shortReports.map(async (shortReport) => {
        const detailedStormReport: StormDataResponseBody = await fetch(
          `https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/${shortReport.path}?v2`,
        ).then((data) => data.json());

        const {activated48kt, activated64kt} = getActivatedDistricts(detailedStormReport);
        const status = detailedStormReport.ready_set_results?.status

        const pastLandfall = hasLandfallOccured(detailedStormReport);

        const isEmailNeeded = status ? shouldSendEmail(status, activated48kt, activated64kt, pastLandfall) : false;

        if (isEmailNeeded) {
          const prismUrl = buildPrismUrl(
            basicPrismUrl,
            detailedStormReport.forecast_details.reference_time,
          );

          return {
            email: emails,
            cycloneName: detailedStormReport.forecast_details.cyclone_name,
            cycloneTime: detailedStormReport.forecast_details.reference_time,
            activatedTriggers: {
              districts48kt: activated48kt,
              districts64kt: activated64kt,
            },
            redirectUrl: prismUrl,
            base64Image: await captureScreenshotFromUrl({
              url: prismUrl,
              elementsToHide: [
                '.MuiDrawer-root',
                '.MuiList-root',
                '.MuiGrid-root',
              ],
              crop: {
                x: 900,
                y: 200,
                width: 1000,
                height: 800,
              },
            }),

            status,
          };
        }

        return false;
      }),
    );
    return emailPayload.filter((payload) => !!payload) as StormAlertData[];
  } catch (e) {
    console.error('Error while creating email payload');
    return [];
  }
}
