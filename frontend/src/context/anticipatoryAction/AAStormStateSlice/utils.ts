import { DatesPropagation, Validity } from 'config/types';
import { generateIntermediateDateItemFromValidity } from 'utils/server-utils';
import { getFormattedDate, getTimeInMilliseconds } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import {
  AACategory,
  AACategoryDataToLandfallMap,
  AACategoryKey,
  AACategoryKeyToCategoryMap,
  AACategoryLandfall,
  DistrictDataType,
  LandfallInfo,
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

// TODO - wait for dates endpoint to be implemented in the WFP API
function extractDates(data: StormData): number[] {
  return [getTimeInMilliseconds(data.forecast_details.reference_time)];
}
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

  const landfallImpactData = landfallInfo
    ? {
        district: landfallInfo.landfall_impact_district,
        time: landfallInfo.landfall_time,
        severity: landfallInfo.landfall_impact_intensity.map(
          (intensity: AACategoryLandfall) =>
            AACategoryDataToLandfallMap[intensity],
        ),
      }
    : ({} as LandfallInfo);

  const validity: Validity = {
    mode: DatesPropagation.DAYS,
    forward: 0,
  };
  const dates = extractDates(data);
  const availableDates = generateIntermediateDateItemFromValidity(
    dates,
    validity,
  );

  return {
    data: {
      activeDistricts,
      naDistricts,
      landfall: landfallImpactData,
      timeSeries: data.time_series,
      landfallDetected: data.landfall_detected,
      forecastDetails: data.forecast_details,
    },
    availableDates,
    range: {
      start: getFormattedDate(dates[0], DateFormat.Default),
      end: getFormattedDate(dates[dates.length - 1], DateFormat.Default),
    },
  };
}
