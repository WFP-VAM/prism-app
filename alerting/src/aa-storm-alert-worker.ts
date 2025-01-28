import { isNaN } from 'lodash';
import Bluebird from 'bluebird';
import nodeFetch from 'node-fetch';
import { createConnection, Repository } from 'typeorm';
import { API_URL } from './constants';
import { Alert } from './entities/alerts.entity';
import { calculateAlert } from './utils/analysis-utils';
import { sendEmail } from './utils/email';
import { fetchCoverageLayerDays, formatUrl, WMS } from 'prism-common';

// @ts-ignore
global.fetch = nodeFetch;

function shouldSendEmail(): boolean {
  return false;
}

async function run() {
  //check whether an email should be sent
  if (shouldSendEmail()) {
    // send email
  }
}

run();
