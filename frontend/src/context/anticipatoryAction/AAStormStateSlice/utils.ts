import { DatesPropagation, Validity } from 'config/types';
import { generateIntermediateDateItemFromValidity } from 'utils/server-utils';
import { getFormattedDate } from 'utils/date-utils';
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

function extractDatesFromTimeSeries(data: StormData): number[] {
  return data.time_series.features.map(feature =>
    new Date(feature.properties.time).getTime(),
  );
}
// DRAFT: This is a provisional implementation based on a test dataset with a temporary structure that is subject to change.
export function parseAndTransformAA(data: StormData): ResultType {
  const exposedAreas = data.ready_set_results;
  const landfallInfo = data.landfall_info;
  const riskArea = exposedAreas?.proba_48kt_20_5d;

  const [activeDistricts, naDistricts] = exposedAreas
    ? (Object.values(AACategoryKey) as AACategoryKey[]).reduce(
        ([activeResult, naResult], categoryKey) => {
          if (exposedAreas[categoryKey]) {
            const area = exposedAreas[categoryKey];
            const category = AACategoryKeyToCategoryMap[categoryKey];

            if (area.affected_districts) {
              const active = area.affected_districts.filter(district =>
                watchedDistricts[category].includes(district),
              );

              const notActive = watchedDistricts[category].filter(
                district => !area.affected_districts.includes(district),
              );

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
    forward: 3,
  };
  const dates = extractDatesFromTimeSeries(data);
  const availableDates = generateIntermediateDateItemFromValidity(
    dates,
    validity,
  );

  return {
    data: {
      activeDistricts,
      riskArea,
      naDistricts,
      landfall: landfallImpactData,
      timeSeries: data.time_series,
    },
    availableDates,
    range: {
      start: getFormattedDate(dates[0], DateFormat.Default),
      end: getFormattedDate(dates[dates.length - 1], DateFormat.Default),
    },
  };
}
