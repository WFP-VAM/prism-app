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
  LandfallImpact,
  ResultType,
  StormData,
} from './types';

const NADistricts: { [key in AACategory]: string[] } = {
  [AACategory.Severe]: [
    'Mogincual',
    'Namacurra',
    'Cidade Da Beira',
    'Buzi',
    'Dondo',
    'Vilankulo',
  ],
  [AACategory.Moderate]: ['Angoche', 'Maganja Da Costa', 'Machanga', 'Govuro'],
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

  const districtAreaData = exposedAreas
    ? (Object.values(AACategoryKey) as AACategoryKey[]).reduce(
        (result, categoryKey) => {
          if (exposedAreas[categoryKey]) {
            const area = exposedAreas[categoryKey];
            const category = AACategoryKeyToCategoryMap[categoryKey];
            return {
              ...result,
              [category]: {
                Ready: {
                  districtNames: area.affected_districts,
                  polygon: area.polygon.coordinates,
                },
                na: {
                  districtNames: NADistricts[category],
                  polygon: {},
                },
              },
            };
          }
          return result;
        },
        {} as DistrictDataType,
      )
    : ({} as DistrictDataType);

  const landfallImpactData = landfallInfo
    ? {
        district: landfallInfo.landfall_impact_district,
        time: {
          start: landfallInfo.landfall_time[0],
          end: landfallInfo.landfall_time[1],
        },
        severity: landfallInfo.landfall_impact_intensity.map(
          (intensity: AACategoryLandfall) =>
            AACategoryDataToLandfallMap[intensity],
        ),
      }
    : ({} as LandfallImpact);

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
      exposed: districtAreaData,
      landfall: landfallImpactData,
    },
    availableDates,
    range: {
      start: getFormattedDate(dates[0], DateFormat.Default),
      end: getFormattedDate(dates[dates.length - 1], DateFormat.Default),
    },
  };
}
