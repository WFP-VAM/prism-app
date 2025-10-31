import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import { getTitle } from 'utils/title-utils';
import { FeatureTitleObject } from 'config/types';
import { PopupData } from 'context/tooltipStateSlice';
import { FloodChartConfigObject } from 'context/tableStateSlice';
import { t } from 'i18next';

export type GoogleFloodParams = {
  gaugeId: string;
  triggerLevels: GoogleFloodTriggerLevels;
  detailUrl: string;
  chartTitle: string;
  unit: string;
  yAxisLabel: string;
};

const GOOGLE_FLOOD_UNITS = {
  GAUGE_VALUE_UNIT_UNSPECIFIED: '',
  METERS: 'm',
  CUBIC_METERS_PER_SECOND: 'm³/s',
};

const GOOGLE_FLOOD_Y_AXIS_LABEL = {
  GAUGE_VALUE_UNIT_UNSPECIFIED: '',
  METERS: 'Unit = water depth in m',
  CUBIC_METERS_PER_SECOND: 'Unit = discharge in m³/s',
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
  station_id: number;
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
  const { gaugeId, thresholds, gaugeValueUnit } = featureProperties;
  const chartTitle =
    t(
      (getTitle(featureInfoTitle, featureProperties) as PopupData)?.title
        .data as string,
      featureProperties,
    ) || featureProperties.gaugeId;

  const parsedLevels = JSON.parse(thresholds);
  const triggerLevels = {
    warning: parsedLevels.warningLevel.toFixed(2),
    danger: parsedLevels.dangerLevel.toFixed(2),
    extremeDanger: parsedLevels.extremeDangerLevel.toFixed(2),
  };
  const unit =
    GOOGLE_FLOOD_UNITS[gaugeValueUnit as keyof typeof GOOGLE_FLOOD_UNITS];
  const yAxisLabel = t(
    GOOGLE_FLOOD_Y_AXIS_LABEL[
      gaugeValueUnit as keyof typeof GOOGLE_FLOOD_Y_AXIS_LABEL
    ],
  );

  return {
    gaugeId,
    triggerLevels,
    chartTitle,
    detailUrl,
    unit: t(unit),
    yAxisLabel: t(yAxisLabel),
  };
};

export const isGoogleFloodDatasetParams = (
  params: GoogleFloodParams,
): params is GoogleFloodParams => params.gaugeId !== undefined;
