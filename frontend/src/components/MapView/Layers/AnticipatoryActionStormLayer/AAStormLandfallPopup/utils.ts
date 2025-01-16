import { ParsedStormData } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { AAStormTimeSeriesFeature } from 'context/anticipatoryAction/AAStormStateSlice/rawStormDataTypes';

/* find the wind point which time corresponds to the landfall estimated time */
export function findLandfallWindPoint(stormData: ParsedStormData) {
  const { landfall } = stormData;
  if (!landfall) {
    return null;
  }

  const landfallEstimatedtime = landfall.time;

  const windpoints = stormData.timeSeries?.features;
  return windpoints?.find(windpoint =>
    isFeatureAtLandfallEstimateTime(windpoint, landfallEstimatedtime),
  );
}

export function isFeatureAtLandfallEstimateTime(
  feature: AAStormTimeSeriesFeature,
  landfallEstimatedtime: string[],
) {
  return (
    landfallEstimatedtime &&
    feature.properties.time === landfallEstimatedtime[0]
  );
}
