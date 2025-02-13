import { LandfallInfo } from 'prism-common/dist/types/anticipatory-action-storm/reportResponse';
import { WindState } from 'prism-common/dist/types/anticipatory-action-storm/windState';

export function buildLandfallInfo({
  landfall_time = ['2025-01-13 06:00:00', '2025-01-13 18:00:00'],
}: Partial<LandfallInfo>): LandfallInfo {
  return {
    landfall_time,
    landfall_impact_district: 'Mogincual',
    landfall_impact_intensity: [],
    landfall_leadtime_hours: [0.0, 12.0],
    is_coastal: true,
  };
}

export function buildDetailedReport({
  landfall_detected = false,
  status = WindState.monitoring,
  affected48ktDistrict = [],
  affected64ktDistrict = [],
  landfallInfo = {} as LandfallInfo | Record<string, never>,
}: {
  landfall_detected?: boolean;
  status?: WindState;
  affected48ktDistrict?: string[];
  affected64ktDistrict?: string[];
  landfallInfo?: LandfallInfo | Record<string, never>;
}) {
  return {
    forecast_details: {
      cyclone_name: 'ELVIS',
      season: 20242025,
      reference_time: '2025-01-31T06:00:00Z',
      basin: 'SWI',
    },
    landfall_detected,
    landfall_info: landfallInfo,
    ready_set_results: {
      status,
      exposed_area_48kt: {
        affected_districts: affected48ktDistrict,
        polygon: {
          type: 'Polygon',
          coordinates: [],
        },
      },
      exposed_area_64kt: {
        affected_districts: affected64ktDistrict,
        polygon: {
          type: 'Polygon',
          coordinates: [],
        },
      },
    },
    uncertainty_cone: {
      type: 'Polygon',
      /* coordinates are not filled in this builder because not usefull */
      coordinates: [],
    },
    /* timeSeries are not filled in this builder because not usefull */
    time_series: {},
  };
}

export function buildAnticipatoryActionAlerts({
  id = 1,
  country = 'mozambique',
  emails = [],
  prismUrl = 'http://example.com',
  lastRanAt = new Date(),
  lastStates = {},
}) {
  return {
    id,
    country,
    emails,
    prismUrl,
    lastRanAt,
    lastStates,
  };
}
