import { isNaN } from 'lodash';
import Bluebird from 'bluebird';
import nodeFetch from 'node-fetch';
import { createConnection, Repository } from 'typeorm';
import { API_URL } from './constants';
import { Alert } from './entities/alerts.entity';
import { calculateAlert } from './utils/analysis-utils';
import { sendEmail } from './utils/email';
import { fetchCoverageLayerDays, formatUrl, WMS } from 'prism-common';
import moment from 'moment';
import { StormDataResponseBody, WindState } from './types/rawStormDataTypes';

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

async function buildEmailPayloads(): Promise<EmailPayload[]> {
  // get all the reports
  const allReports = await fetchAllReports();
  console.log('allReports', allReports);
  if (!allReports) {
    console.error('Error fetching all reports');
    return [];
  }

  // filter today's reports
  const today = moment.utc().format('YYYY-MM-DD');
  const todaysReports = allReports[today];
  if (!todaysReports) {
    return [];
  }

  // for each today's storm
  const falsyOrEmailPayloads = await Promise.all(
    Object.keys(todaysReports).map(async (stormName) => {
      const stormShortReports = todaysReports[stormName];

      // get the latest detailed report for that storm
      const latestReport = stormShortReports.reduce(
        (latestShortReport, currentShortReport) =>
          new Date(currentShortReport.ref_time) >
          new Date(latestShortReport.ref_time)
            ? currentShortReport
            : latestShortReport,
      );

      const detailedStormReport: StormDataResponseBody = await fetch(
        `https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/${latestReport.path}?v2`,
      ).then((data) => data.json());

      console.log('detailedstormreport', detailedStormReport);
      // decide whether an email is required
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

  return falsyOrEmailPayloads.filter((payload) => payload);
}

async function run() {
  //check whether an email should be sent
  buildEmailPayloads().then((emailPayloads) => {
    console.log('emailPayload', emailPayloads);

    // create templates
    // send emails
  });
}

run();
