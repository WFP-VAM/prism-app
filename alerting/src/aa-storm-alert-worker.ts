import nodeFetch from 'node-fetch';
import { createConnection, Repository } from 'typeorm';
import { StormDataResponseBody, WindState } from './types/rawStormDataTypes';
import { LatestAAStormReports } from './entities/latestAAStormReports.entity';

interface EmailPayload {}

interface ShortReport {
  ref_time: string;
  state: string;
  path: string;
}

interface ShortReportsResponseBody {
  [date: string]: {
    [stormName: string]: ShortReport[];
  };
}

// @ts-ignore
global.fetch = nodeFetch;

function fetchAllReports(): Promise<ShortReportsResponseBody | null> {
  try {
    return fetch(
      'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/dates.json',
    ).then((data) => data.json());
  } catch {
    return Promise.reject(null);
  }
}

function isEmailNeededByReport(report: StormDataResponseBody) {
  if (report.landfall_detected) {
    return false;
  }

  const status = report.ready_set_results?.status;

  if (!status) {
    return false;
  }

  if (status === WindState.ready) {
    return true;
  }

  const exposed_area_64kt = report.ready_set_results?.exposed_area_64kt;

  const watchedDistrictsFor64KtStorm = [
    'Mogincual',
    'Namacurra',
    'Cidade Da Beira',
    'Buzi',
    'Dondo',
    'Vilankulo',
  ];

  if (
    status === WindState.activated_118 &&
    exposed_area_64kt &&
    exposed_area_64kt.affected_districts.filter((district) =>
      watchedDistrictsFor64KtStorm.includes(district),
    ).length > 0
  ) {
    return true;
  }

  const exposed_area_48kt = report.ready_set_results?.exposed_area_48kt;

  const watchedDistrictsFor48ktStorm = [
    'Angoche',
    'Maganja Da Costa',
    'Machanga',
    'Govuro',
  ];

  if (
    status === WindState.activated_64 &&
    exposed_area_48kt &&
    exposed_area_48kt.affected_districts.filter((district) =>
      watchedDistrictsFor48ktStorm.includes(district),
    ).length > 0
  ) {
    return true;
  }

  return false;
}

// fetch and extract the more recent short report for each reported storm
async function fetchLatestAvailableReports() {
  // fetch all reports
  const allReports = await fetchAllReports();

  if (!allReports) {
    console.error('Error fetching all reports');
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

async function filterAlreadyProcessedReports(
  availableReports: ShortReport[],
  latestStormReportsRepository: Repository<LatestAAStormReports>,
) {
  // get the last reports which have been processed for email alert system
  const latestProcessedReports = await latestStormReportsRepository.find();

  const latestProcessedReportsPaths = latestProcessedReports.map(
    (item) => item.reportIdentifier,
  );

  return availableReports.filter(
    (availableReport) =>
      !latestProcessedReportsPaths.includes(availableReport.path),
  );
}

async function buildEmailPayloads(
  shortReports: ShortReport[],
): Promise<EmailPayload[]> {
  try {
    const emailPayload = await Promise.all(
      shortReports.map(async (shortReport) => {
        const detailedStormReport: StormDataResponseBody = await fetch(
          `https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/${shortReport.path}?v2`,
        ).then((data) => data.json());

        const isEmailNeeded = isEmailNeededByReport(detailedStormReport);

        if (isEmailNeeded) {
          // TODO: add the missing items required to feed the email template
          return {
            cycloneName: detailedStormReport.forecast_details.cyclone_name,
          };
        }

        return false;
      }),
    );
    return emailPayload.filter((payload) => payload);
  } catch (e) {
    console.error('Error while creating email payload');
    return [];
  }
}

async function run() {
  // create a connection to the remote db
  const connection = await createConnection();
  const latestStormReportsRepository =
    connection.getRepository(LatestAAStormReports);

  const latestAvailableReports = await fetchLatestAvailableReports();

  // filter reports which have been already processed

  const filteredAvailableReports = await filterAlreadyProcessedReports(
    latestAvailableReports,
    latestStormReportsRepository,
  );

  // check whether an email should be sent
  buildEmailPayloads(filteredAvailableReports).then((emailPayloads) => {
    console.log('emailPayload', emailPayloads);

    // create templates
    // send emails
  });

  // drop all latest storm reports stored to prevent accumulation of useless data in this table by time
  await latestStormReportsRepository.clear();
  await latestStormReportsRepository.save(
    latestAvailableReports.map((report) => ({ reportIdentifier: report.path })),
  );
}

run();
