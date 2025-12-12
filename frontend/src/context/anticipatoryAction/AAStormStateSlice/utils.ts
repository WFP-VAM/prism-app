import { WindState, StormDataResponseBody } from 'prism-common/';
import {
  AACategory,
  AACategoryDataToLandfallMap,
  AACategoryKey,
  AACategoryKeyToCategoryMap,
  AACategoryLandfall,
  DistrictDataType,
  MergedFeatures,
  ResultType,
} from './parsedStormDataTypes';
import { allDistrictsInCoastalProvince } from './districs';

const watchedDistricts: { [key in AACategory]: string[] } = {
  [AACategory.Moderate]: allDistrictsInCoastalProvince,
  [AACategory.Severe]: allDistrictsInCoastalProvince,
  [AACategory.Risk]: [],
};

/**
 * Creates a merged GeoJSON FeatureCollection from storm data response ready to be downloaded.
 * Combines exposed areas, uncertainty cone, time series, and metadata into a single GeoJSON object.
 *
 * @param data - The storm data response containing various geographical features
 * @returns A GeoJSON FeatureCollection containing all merged features
 */
function createMergedGeoJSON(data: StormDataResponseBody) {
  const features: MergedFeatures[] = [];

  // Helper function to add exposed area features
  const addExposedArea = (
    key: 'exposed_area_48kt' | 'exposed_area_64kt' | 'proba_48kt_20_5d',
  ) => {
    const exposedArea = data.ready_set_results?.[key];
    if (exposedArea) {
      features.push({
        type: 'Feature',
        properties: {
          data_type: key,
          affected_districts: exposedArea.affected_districts,
        },
        geometry: exposedArea.polygon,
      });
    }
  };

  // Add exposed areas
  addExposedArea('exposed_area_48kt');
  addExposedArea('exposed_area_64kt');

  // Add uncertainty cone if it exists
  if (data.uncertainty_cone) {
    features.push({
      type: 'Feature',
      properties: {
        data_type: 'uncertainty_cone',
      },
      geometry: data.uncertainty_cone,
    });
  }

  // Add time series features if they exist
  if (data.time_series) {
    data.time_series.features.forEach(feature => {
      features.push(feature);
    });
  }

  // Create metadata feature

  features.push({
    type: 'Feature',
    properties: {
      data_type: 'metadata',
      forecast_details: data.forecast_details,
      landfall_detected: data.landfall_detected,
      landfall_info: data.landfall_info,
    },
    geometry: null,
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

// DRAFT: This is a provisional implementation based on a test dataset with a temporary structure that is subject to change.
export function parseAndTransformAA(data: StormDataResponseBody): ResultType {
  const exposedAreas = data.ready_set_results;
  const landfallInfo = data.landfall_info;

  // Determine if watched districts are active based on storm status
  // const isActivated =
  //   exposedAreas &&
  //   (exposedAreas.status === WindState.activated_64kt ||
  //     exposedAreas.status === WindState.activated_48kt);

  // Check if there is readiness based on storm status
  const readiness = exposedAreas?.status === WindState.ready;

  // Process the active and inactive districts
  const [activeDistricts, naDistricts] = (
    Object.values(AACategoryKey) as AACategoryKey[]
  ).reduce(
    ([activeResult, naResult], categoryKey) => {
      const category = AACategoryKeyToCategoryMap[categoryKey];

      // // If the storm status is not active, all watched districts should be marked as inactive
      // if (!isActivated) {
      //   return [
      //     activeResult,
      //     {
      //       ...naResult,
      //       [category]: {
      //         districtNames: watchedDistricts[category] || [],
      //         polygon: {},
      //       },
      //     },
      //   ];
      // }

      // Get the affected area data for the current category
      const area = exposedAreas?.[categoryKey];

      // Convert affected districts into a Set for fast lookups
      const affectedDistricts = new Set(area?.affected_districts || []);

      // Retrieve the watched districts for this category
      const watched = watchedDistricts[category] || [];

      // Determine which watched districts are active and which are not
      const active = watched.filter(district =>
        affectedDistricts.has(district),
      );
      const notActive = watched.filter(
        district => !affectedDistricts.has(district),
      );

      // Return updated active and inactive district data
      return [
        {
          ...activeResult,
          [category]: {
            districtNames: active,
            polygon: area?.polygon,
          },
        },
        {
          ...naResult,
          [category]: {
            districtNames: notActive,
            polygon: {},
          },
        },
      ];
    },
    [{} as DistrictDataType, {} as DistrictDataType],
  );

  // Extract landfall impact details if available
  const landfallImpactData = landfallInfo?.landfall_time
    ? {
        district: landfallInfo.landfall_impact_district,
        time: landfallInfo.landfall_time,
        severity: landfallInfo.landfall_impact_intensity?.map(
          (intensity: AACategoryLandfall) =>
            AACategoryDataToLandfallMap[intensity],
        ),
      }
    : undefined;

  // Generate a merged GeoJSON object
  const mergedGeoJSON = createMergedGeoJSON(data);

  return {
    data: {
      activeDistricts,
      naDistricts,
      readiness,
      landfall: landfallImpactData,
      timeSeries: data.time_series,
      landfallDetected: data.landfall_detected,
      forecastDetails: data.forecast_details,
      uncertaintyCone: data.uncertainty_cone,
      mergedGeoJSON,
    },
  };
}
