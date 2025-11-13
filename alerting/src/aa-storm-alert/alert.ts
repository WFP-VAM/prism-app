import {
  LastStates,
  ShortReport,
  ShortReportsResponseBody,
} from '../types/storm-reports';
import nodeFetch from 'node-fetch';
import { WindState } from 'prism-common';
import { StormDataResponseBody } from 'prism-common';
import { StormAlertData } from '../types/storm-email';
import { captureScreenshotFromUrl } from '../utils/capture-utils';
import { formatDate } from '../utils/date';
import { allDistrictsInCoastalProvince } from './districs';

const args = process.argv.slice(2);
const IS_TEST = args.some((arg) => arg.startsWith('--testEmail='));

// @ts-ignore
global.fetch = nodeFetch;

async function fetchAllReports(): Promise<ShortReportsResponseBody | null> {
  try {
    const data = await fetch(
      'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/dates.json',
    );
    return await data.json();
  } catch {
    console.error('Error fetching all reports');
    return null;
  }
}

// fetch and extract the more recent short report for each reported storm
export async function getLatestAvailableReports() {
  // fetch all reports
  const allReports = await fetchAllReports();

  if (!allReports) {
    console.log('No reports available');
    return [];
  }

  // Filter reports by state
  const filteredReportsByState: ShortReportsResponseBody | null = Object.keys(
    allReports,
  ).reduce((acc, date) => {
    const dayReports = allReports[date];

    // For each storm in the day, filter by state first
    const stormAcc = Object.keys(dayReports).reduce((stormAcc, stormName) => {
      const stormReports = dayReports[stormName];

      const filteredReports = stormReports.filter(
        (report) =>
          report.state === WindState.ready ||
          report.state === WindState.activated_48kt ||
          report.state === WindState.activated_64kt,
      );

      // If no valid reports, skip this storm
      if (filteredReports.length > 0) {
        stormAcc[stormName] = filteredReports;
      }

      return stormAcc;
    }, {});

    // If there are valid storms for this date, add to the accumulator
    if (Object.keys(stormAcc).length > 0) {
      acc[date] = stormAcc;
    }

    return acc;
  }, {});

  // If no valid reports were found after filtering by state, return empty array
  if (Object.keys(filteredReportsByState).length === 0) {
    console.log('No valid reports available after filtering by state');
    return [];
  }

  // filter latest reports for all storms using day
  const latestReportsDate = Object.keys(filteredReportsByState).reduce(
    (latestDateReports, currentDateReports) =>
      new Date(currentDateReports) > new Date(latestDateReports)
        ? currentDateReports
        : latestDateReports,
  );

  const latestDayReports = filteredReportsByState[latestReportsDate];

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

function getExposedDistricts(report: StormDataResponseBody): {
  exposed48kt: string[];
  exposed64kt: string[];
} {
  const watchedDistrictsFor64KtStorm = allDistrictsInCoastalProvince;

  const watchedDistrictsFor48ktStorm = ['monitoring disabled for 48kt'];

  const exposed64kt =
    report.ready_set_results?.exposed_area_64kt?.affected_districts.filter(
      (district) => watchedDistrictsFor64KtStorm.includes(district),
    );

  const exposed48kt =
    report.ready_set_results?.exposed_area_48kt?.affected_districts.filter(
      (district) => watchedDistrictsFor48ktStorm.includes(district),
    );

  return {
    exposed48kt: exposed48kt || [],
    exposed64kt: exposed64kt || [],
  };
}

function hasLandfallOccured(report: StormDataResponseBody): boolean {
  const landfallInfo = report.landfall_info;
  if ('landfall_time' in landfallInfo) {
    const landfallOutermostTime = landfallInfo.landfall_time[1];
    return new Date() > new Date(landfallOutermostTime);
  }
  return false;
}

/**
 * Send email if the storm has exposed districts (filtered on districts of interest),
 * is not in monitoring state and the landfall has not already occurred.
 */
function shouldSendStormEmail(
  status: WindState,
  exposed48kt: string[],
  exposed64kt: string[],
  pastLandfall: boolean,
): boolean {
  const hasExposed = exposed48kt.length > 0 || exposed64kt.length > 0;
  return !pastLandfall && hasExposed && status !== WindState.monitoring;
}

/**
 * Build the url which enables to visualize the relevant storm data on the map. THis email is used in the email alert.
 * @param date date of the report
 */
function buildPrismUrl(basicUrl: string, date: string) {
  const reportDate = formatDate(date, 'YYYY-MM-DD');
  return new URL(
    `?hazardLayerIds=anticipatory_action_storm&date=${reportDate}`,
    basicUrl,
  ).toString();
}

export async function buildEmailPayloads(
  shortReports: ShortReport[],
  basicPrismUrl: string,
  emails: string[],
): Promise<StormAlertData[]> {
  try {
    console.log(
      `Processing ${shortReports.length} storm reports for email alerts`,
    );
    const emailPayload = await Promise.all(
      shortReports.map(async (shortReport) => {
        const stormName = shortReport.path.split('/')[0];
        console.debug(`Processing storm: ${stormName}`);

        const detailedStormReport: StormDataResponseBody = await fetch(
          `https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/${shortReport.path}?v2`,
        ).then((data) => data.json());

        const { exposed48kt, exposed64kt } =
          getExposedDistricts(detailedStormReport);
        const status = detailedStormReport.ready_set_results?.status;
        const pastLandfall = IS_TEST
          ? false
          : hasLandfallOccured(detailedStormReport);

        const isEmailNeeded = status
          ? shouldSendStormEmail(status, exposed48kt, exposed64kt, pastLandfall)
          : false;
        console.debug(
          `Storm ${stormName} - Status: ${status}, Email needed: ${isEmailNeeded}, Past landfall: ${pastLandfall}`,
        );

        if (isEmailNeeded) {
          const prismUrl = buildPrismUrl(
            basicPrismUrl,
            detailedStormReport.forecast_details.reference_time,
          );

          return {
            email: emails,
            cycloneName: detailedStormReport.forecast_details.cyclone_name,
            cycloneTime: formatDate(
              detailedStormReport.forecast_details.reference_time,
              'DD/MM/YYYY HH:mm UTC',
            ),
            activatedTriggers: {
              districts48kt: exposed48kt,
              districts64kt: exposed64kt,
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
    console.error('Error while creating email payload:', e);
    return [];
  }
}
