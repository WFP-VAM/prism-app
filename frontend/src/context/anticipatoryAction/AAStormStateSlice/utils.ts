import {
  AACategory,
  AACategoryDataToLandfallMap,
  AACategoryKey,
  AACategoryKeyToCategoryMap,
  AACategoryLandfall,
  DistrictDataType,
  ResultType,
} from './parsedStormDataTypes';
import { StormDataResponseBody } from './rawStormDataTypes';

const districtNameMapping: { [key: string]: string } = {
  Maganja_Da_Costa: 'Maganja Da Costa',
  Cidade_Da_Beira: 'Cidade Da Beira',
};

const watchedDistricts: { [key in AACategory]: string[] } = {
  [AACategory.Severe]: [
    'Mogincual',
    'Namacurra',
    'Cidade Da Beira',
    'Buzi',
    'Dondo',
    'Vilankulo',
  ],
  [AACategory.Moderate]: ['Angoche', 'Maganja Da Costa', 'Machanga', 'Govuro'],
  [AACategory.Risk]: [],
};

function createMergedGeoJSON(data: StormDataResponseBody) {
  const features: any[] = [];

  // Helper function to add exposed area features
  const addExposedArea = (
    key: 'exposed_area_48kt' | 'exposed_area_64kt' | 'proba_48kt_20_5d',
  ) => {
    const exposedArea = data.ready_set_results?.[key];
    if (exposedArea) {
      // eslint-disable-next-line fp/no-mutating-methods
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
    // eslint-disable-next-line fp/no-mutating-methods
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
      // eslint-disable-next-line fp/no-mutating-methods
      features.push(feature);
    });
  }

  // Create metadata feature
  // eslint-disable-next-line fp/no-mutating-methods
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

  const [activeDistricts, naDistricts] = exposedAreas
    ? (Object.values(AACategoryKey) as AACategoryKey[]).reduce(
        ([activeResult, naResult], categoryKey) => {
          if (exposedAreas[categoryKey]) {
            const area = exposedAreas[categoryKey];
            const category = AACategoryKeyToCategoryMap[categoryKey];

            const active = area.affected_districts
              ? area.affected_districts
                  .map(district => districtNameMapping[district] || district)
                  .filter(district =>
                    watchedDistricts[category].includes(district),
                  )
              : [];

            const notActive = area.affected_districts
              ? watchedDistricts[category].filter(
                  district =>
                    !area.affected_districts
                      .map(d => districtNameMapping[d] || d)
                      .includes(district),
                )
              : [];

            return [
              {
                ...activeResult,
                [category]: {
                  districtNames: active,
                  polygon: area.polygon,
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
          }
          return [activeResult, naResult];
        },
        [{} as DistrictDataType, {} as DistrictDataType],
      )
    : [{} as DistrictDataType, {} as DistrictDataType];

  const landfallImpactData = landfallInfo.landfall_time
    ? {
        district: landfallInfo.landfall_impact_district,
        time: landfallInfo.landfall_time,
        severity: landfallInfo.landfall_impact_intensity?.map(
          (intensity: AACategoryLandfall) =>
            AACategoryDataToLandfallMap[intensity],
        ),
      }
    : undefined;

  // TODO - remove as any
  const mergedGeoJSON = createMergedGeoJSON(data) as any;

  return {
    data: {
      activeDistricts,
      naDistricts,
      landfall: landfallImpactData,
      timeSeries: data.time_series,
      landfallDetected: data.landfall_detected,
      forecastDetails: data.forecast_details,
      uncertaintyCone: data.uncertainty_cone,
      mergedGeoJSON,
    },
  };
}
