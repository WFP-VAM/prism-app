import { Map as MaplibreMap } from 'maplibre-gl';
import {
  AACategory,
  AACategoryDataToLandfallMap,
  AACategoryKey,
  AACategoryKeyToCategoryMap,
  AACategoryLandfall,
  DistrictDataType,
  ResultType,
  StormData,
} from './types';

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

export const sendMailWithImage = async (map: MaplibreMap | undefined) => {
  if (!map) {
    return;
  }

  const layersToCheck = [
    'layer-admin_boundaries',
    'storm-districts-fill',
    'storm-districts-border',
    'aa-storm-wind-points-layer',
    'storm-risk-map',
    'exposed-area-48kt',
    'exposed-area-64kt',
    'aa-storm-wind-points-line-past',
    'aa-storm-wind-points-line-future',
    'aa-storm-wind-points-layer',
  ];

  const allLayersLoaded = layersToCheck.every(layerId => map.getLayer(layerId));
  if (allLayersLoaded) {
    const originalZoom = map.getZoom();
    const originalCenter: [number, number] = [
      map.getCenter().lng,
      map.getCenter().lat,
    ];

    const zoomLevel = 12;
    const regionCenter: [number, number] = [-73.935242, 40.73061];

    map.setCenter(regionCenter);
    map.setZoom(zoomLevel);

    const canvas = map.getCanvas();
    const image = canvas.toDataURL('image/png');

    // TODO: send mail with image
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.body.innerHTML = `<img src="${image}" alt="Screenshot" style="max-width: 100%;">`;
      newWindow.document.title = 'Carte Screenshot';
    }

    map.setCenter(originalCenter);
    map.setZoom(originalZoom);
  }
};

// DRAFT: This is a provisional implementation based on a test dataset with a temporary structure that is subject to change.
export function parseAndTransformAA(data: StormData): ResultType {
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

  return {
    data: {
      activeDistricts,
      naDistricts,
      landfall: landfallImpactData,
      timeSeries: data.time_series,
      landfallDetected: data.landfall_detected,
      forecastDetails: data.forecast_details,
      uncertaintyCone: data.uncertainty_cone,
    },
  };
}
