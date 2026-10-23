import {
  forecastLeadDay,
  getFloodRiskSeverity,
  isForecastDateInWindow,
  parseFloodStatus,
} from './floodStatus';
import { parseStationSummaryRows } from './utils';

describe('flood status order', () => {
  test('ranks activation above readiness above legacy severity', () => {
    const ranks = [
      'activation_severe',
      'activation_moderate',
      'activation_bankfull',
      'readiness_severe',
      'severe',
      'readiness_moderate',
      'moderate',
      'readiness_bankfull',
      'bankfull',
      'not exceeded',
    ].map(status => getFloodRiskSeverity(status));

    expect(ranks).toEqual([7, 6, 5, 4, 4, 3, 3, 2, 2, 1]);
  });

  test('parses combined and legacy statuses', () => {
    expect(parseFloodStatus('activation_moderate')).toMatchObject({
      id: 'activation_moderate',
      phase: 'activation',
      severity: 'Moderate',
      rank: 6,
    });
    expect(parseFloodStatus('Severe')).toMatchObject({
      id: 'severe',
      phase: null,
      severity: 'Severe',
      rank: 4,
    });
    expect(parseFloodStatus('not exceeded').id).toBe('not_exceeded');
    expect(parseFloodStatus('').rank).toBe(0);
  });

  test('matches forecast dates inside a lead-time window', () => {
    expect(
      isForecastDateInWindow(
        '2025-12-30T00:00:00Z',
        '2025-12-30',
        '2026-01-01',
      ),
    ).toBe(true);
    expect(
      isForecastDateInWindow('2025-12-28', '2025-12-30', '2026-01-01'),
    ).toBe(false);
  });

  test('day 1 is the first valid_time, the day after issue', () => {
    const times = [
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
    ];
    expect(forecastLeadDay(times, '2025-12-27')).toBeUndefined();
    expect(forecastLeadDay(times, '2025-12-28')).toBe(1);
    expect(forecastLeadDay(times, '2025-12-30')).toBe(3);
    expect(forecastLeadDay(times, '2026-01-01')).toBe(5);
  });
});

describe('station summary parsing', () => {
  test('keeps the legacy wide row', () => {
    const stations = parseStationSummaryRows(
      [
        {
          station_name: 'beira_port',
          station_id: 1,
          river_name: 'zambezi',
          longitude: 34.8,
          latitude: -19.8,
          forecast_issue_date: '2025-12-27',
          window_begin: '2025-12-30',
          window_end: '2026-01-01',
          avg_moderate_percentage: 0.42,
          trigger_moderate: 0.3,
          trigger_status: 'moderate',
        },
      ],
      '2025-12-27',
    );

    expect(stations['id:1']).toMatchObject({
      trigger_status: 'Moderate',
      floodStatus: 'moderate',
      phase: null,
      avg_moderate_percentage: 42,
      trigger_moderate: 30,
    });
    expect(stations['id:1'].combinations).toBeUndefined();
  });

  test('aggregates the long format and trusts the status column', () => {
    const stations = parseStationSummaryRows(
      [
        {
          station_name: 'gurue',
          station_id: 2,
          river_name: 'licungo',
          longitude: 36.9,
          latitude: -15.4,
          phase: 'readiness',
          severity: 'severe',
          window_begin: '2025-12-28',
          window_end: '2026-01-03',
          avg_probability: 0.2,
          trigger: 0.5,
          threshold: 1200,
          exceeded: false,
          status: 'activation_moderate',
        },
        {
          station_name: 'gurue',
          station_id: 2,
          river_name: 'licungo',
          longitude: 36.9,
          latitude: -15.4,
          phase: 'activation',
          severity: 'moderate',
          window_begin: '2025-12-30',
          window_end: '2026-01-01',
          avg_probability: 0.61,
          trigger: 0.4,
          exceeded: true,
          status: 'activation_moderate',
        },
        {
          station_name: 'gurue',
          station_id: 2,
          river_name: 'licungo',
          longitude: 36.9,
          latitude: -15.4,
          phase: 'activation',
          severity: 'bankfull',
          trigger: '',
          status: 'activation_moderate',
        },
      ],
      '2025-12-27',
    );

    const station = stations['id:2'];
    expect(station.floodStatus).toBe('activation_moderate');
    expect(station.phase).toBe('activation');
    expect(station.trigger_status).toBe('Moderate');
    expect(station.combinations).toEqual([
      {
        phase: 'readiness',
        severity: 'severe',
        windowBegin: '2025-12-28',
        windowEnd: '2026-01-03',
        avgProbability: 20,
        trigger: 50,
        dischargeThreshold: 1200,
        exceeded: false,
      },
      {
        phase: 'activation',
        severity: 'moderate',
        windowBegin: '2025-12-30',
        windowEnd: '2026-01-01',
        avgProbability: 61,
        trigger: 40,
        dischargeThreshold: null,
        exceeded: true,
      },
    ]);
  });

  test('derives status from exceeded flags when the status column is empty', () => {
    const stations = parseStationSummaryRows(
      [
        {
          station_name: 'franca',
          station_id: 3,
          river_name: 'limpopo',
          longitude: 33,
          latitude: -25,
          phase: 'readiness',
          severity: 'bankfull',
          trigger: 0.2,
          exceeded: true,
          avg_probability: 0.3,
        },
        {
          station_name: 'franca',
          station_id: 3,
          river_name: 'limpopo',
          longitude: 33,
          latitude: -25,
          phase: 'activation',
          severity: 'severe',
          trigger: 0.8,
          exceeded: false,
          avg_probability: 0.1,
        },
      ],
      '2025-12-27',
    );

    expect(stations['id:3'].floodStatus).toBe('readiness_bankfull');
    expect(stations['id:3'].phase).toBe('readiness');
  });

  test('schema_version 2 reads the long file and 1 keeps the wide file', () => {
    const longRow = {
      station_name: 'beira_port',
      station_id: 1,
      river_name: 'zambezi',
      longitude: 34.8,
      latitude: -19.8,
      phase: 'activation',
      severity: 'severe',
      trigger: 0.4,
      threshold: 900,
      avg_probability: 0.5,
      exceeded: true,
      status: 'activation_severe',
      window_begin: '2025-12-30',
      window_end: '2026-01-01',
    };
    const versionTwo = parseStationSummaryRows([longRow], '2025-12-27', 2);
    expect(versionTwo['id:1'].floodStatus).toBe('activation_severe');
    expect(versionTwo['id:1'].combinations?.[0].dischargeThreshold).toBe(900);

    const versionOne = parseStationSummaryRows(
      [
        {
          ...longRow,
          trigger_status: 'moderate',
          trigger_moderate: 0.3,
          avg_moderate_percentage: 0.42,
        },
      ],
      '2025-12-27',
      1,
    );
    expect(versionOne['id:1'].floodStatus).toBe('moderate');
    expect(versionOne['id:1'].combinations).toBeUndefined();
  });

  test('joins on station_id when the name spelling differs', () => {
    const stations = parseStationSummaryRows(
      [
        {
          station_name: 'Limpopo__Combomune',
          station_id: 33,
          river_name: 'Limpopo',
          longitude: 32.4,
          latitude: -23.4,
          phase: 'readiness',
          severity: 'moderate',
          trigger: 0.3,
          exceeded: false,
          status: 'activation_severe',
        },
        {
          station_name: 'limpopo_combomune',
          station_id: '33',
          river_name: 'Limpopo',
          longitude: 32.4,
          latitude: -23.4,
          phase: 'activation',
          severity: 'severe',
          trigger: 0.5,
          exceeded: true,
          status: 'activation_severe',
        },
      ],
      '2025-12-27',
      2,
    );

    expect(Object.keys(stations)).toEqual(['id:33']);
    expect(stations['id:33'].station_name).toBe('Limpopo Combomune');
    expect(stations['id:33'].combinations).toHaveLength(2);
  });

  test('falls back to the station name when station_id is missing', () => {
    const stations = parseStationSummaryRows(
      [
        {
          station_name: 'goonda',
          river_name: 'Buzi',
          longitude: 33.8,
          latitude: -19.8,
          trigger_status: 'severe',
        },
      ],
      '2025-12-27',
      1,
    );

    expect(stations.Goonda.floodStatus).toBe('severe');
    expect(stations.Goonda.station_id).toBe(0);
  });
});
