import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import { getTitle } from 'utils/title-utils';
import { FeatureTitleObject } from 'config/types';
import { PopupData } from 'context/tooltipStateSlice';
import { FloodChartConfigObject } from 'context/tableStateSlice';

export type GoogleFloodParams = {
  gaugeId: string;
  triggerLevels: GoogleFloodTriggerLevels;
  detailUrl: string;
  chartTitle: string;
};

export const GoogleFloodTriggersConfig: FloodChartConfigObject = {
  normal: {
    label: 'Normal',
    color: '#1a9641',
  },
  warning: {
    label: 'Warning',
    color: '#f9d84e',
  },
  danger: {
    label: 'Danger',
    color: '#fdae61',
  },
  extremeDanger: {
    label: 'Extreme danger',
    color: '#e34a33',
  },
};

/* eslint-disable camelcase */
export type FloodSensorData = {
  location_id: number;
  value: [string, number];
};

type GoogleFloodTriggerLevels = {
  warning: number;
  danger: number;
  extremeDanger: number;
};
/* eslint-enable camelcase */

// input parameter is used here only for testing
export const createGoogleFloodDatesArray = (testEndDate?: number): number[] => {
  const datesArray = [];

  const now = new Date();

  const endDate = testEndDate
    ? new Date(testEndDate).setUTCHours(12, 0, 0, 0)
    : now.setUTCHours(12, 0, 0, 0);

  const tempDate = new Date('2021-01-01');
  tempDate.setUTCHours(12, 0, 0, 0);

  while (tempDate.getTime() <= endDate) {
    // eslint-disable-next-line fp/no-mutating-methods
    datesArray.push(tempDate.getTime());

    tempDate.setTime(tempDate.getTime() + oneDayInMs);
  }

  return datesArray;
};

export const createGoogleFloodDatasetParams = (
  featureProperties: any,
  detailUrl: string,
  featureInfoTitle?: FeatureTitleObject,
): GoogleFloodParams => {
  const { gaugeId, thresholds } = featureProperties;
  const chartTitle =
    ((getTitle(featureInfoTitle, featureProperties) as PopupData)?.title
      .data as string) || featureProperties.gaugeId;

  const parsedLevels = JSON.parse(thresholds);
  const triggerLevels = {
    warning: parsedLevels.warningLevel,
    danger: parsedLevels.dangerLevel,
    extremeDanger: parsedLevels.extremeDangerLevel,
  };

  return {
    gaugeId,
    triggerLevels,
    chartTitle,
    detailUrl,
  };
};
