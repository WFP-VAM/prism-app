import {
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

    expect(stations['Beira Port']).toMatchObject({
      trigger_status: 'Moderate',
      floodStatus: 'moderate',
      phase: null,
      avg_moderate_percentage: 42,
      trigger_moderate: 30,
    });
    expect(stations['Beira Port'].combinations).toBeUndefined();
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

    const station = stations.Gurue;
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
        exceeded: false,
      },
      {
        phase: 'activation',
        severity: 'moderate',
        windowBegin: '2025-12-30',
        windowEnd: '2026-01-01',
        avgProbability: 61,
        trigger: 40,
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

    expect(stations.Franca.floodStatus).toBe('readiness_bankfull');
    expect(stations.Franca.phase).toBe('readiness');
  });
});
