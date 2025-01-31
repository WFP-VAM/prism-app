import { WindState } from '../types/rawStormDataTypes';

export function buildDetailedReport({
  landfall_detected = false,
  status = WindState.monitoring,
  affected48ktDistrict = [],
  affected64ktDistrict = [],
}: {
  landfall_detected?: boolean;
  status?: WindState;
  affected48ktDistrict?: string[];
  affected64ktDistrict?: string[];
}) {
  return {
    forecast_details: {
      cyclone_name: 'ELVIS',
      season: 20242025,
      reference_time: '2025-01-31T06:00:00Z',
      basin: 'SWI',
    },
    landfall_detected,
    landfall_info: {},
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
