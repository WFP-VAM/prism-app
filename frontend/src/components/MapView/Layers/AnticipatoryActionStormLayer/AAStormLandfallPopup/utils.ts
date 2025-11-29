import { ParsedStormData } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { AAStormTimeSeriesFeature } from 'prism-common/';
import { getDateInUTC } from '../utils';

function getLandfallEstimatedTime(stormData: ParsedStormData) {
  const { landfall } = stormData;
  if (!landfall) {
    return null;
  }

  return landfall.time;
}

/* find the wind point which time corresponds to the landfall estimated time */
export function findLandfallWindPoint(stormData: ParsedStormData) {
  const landfallEstimatedtime = getLandfallEstimatedTime(stormData);

  const windpoints = stormData.timeSeries?.features;
  const foundWindPoint = windpoints?.find((windpoint: AAStormTimeSeriesFeature) =>
    isFeatureAtLandfallEstimateTime(windpoint, landfallEstimatedtime),
  );

  return foundWindPoint || null;
}

export function isFeatureAtLandfallEstimateTime(
  feature: AAStormTimeSeriesFeature,
  landfallEstimatedtime: string[] | null,
) {
  return (
    landfallEstimatedtime &&
    feature.properties.time === landfallEstimatedtime[0]
  );
}

export function hasLandfallOccured(stormData: ParsedStormData) {
  const reportTime = stormData.forecastDetails?.reference_time;

  const reportTimeDate = getDateInUTC(reportTime);

  if (!reportTimeDate) {
    return null;
  }

  const landfallEstimatedtimeRange = getLandfallEstimatedTime(stormData);

  if (!landfallEstimatedtimeRange) {
    return null;
  }

  const landfallEstimatedStartTime = getDateInUTC(
    landfallEstimatedtimeRange[0],
  );

  if (!landfallEstimatedStartTime) {
    return null;
  }

  return reportTimeDate?.valueOf() > landfallEstimatedStartTime.valueOf();
}
