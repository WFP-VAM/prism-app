import timezoneMock from 'timezone-mock';

import { timezones } from '../../test/helpers';
import {
  createEWSDatasetParams,
  createEWSDatesArray,
  fetchEWSDataPointsByLocation,
} from './ews-utils';

const f = () => {
  expect(createEWSDatesArray(testEndDate)).toEqual(ret);
};

describe('createEWSDatesArray', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test.each(timezones)('Should work with %s', timezone => {
    timezoneMock.register(timezone);
    f();
  });
});

describe('createEWSDatasetParams', () => {
  it('parses object trigger levels from the new API', () => {
    expect(
      createEWSDatasetParams(
        {
          id: 410,
          name: 'Pramaoy Bridge',
          external_id: 'TEPv5.10-001',
          trigger_levels: {
            watch_level: 1000,
            warning: 2000,
            severe_warning: 3000,
          },
        },
        'https://ews1294.com/wp-json/api/v1',
      ),
    ).toEqual({
      locationId: 410,
      chartTitle: 'River level - Pramaoy Bridge (TEPv5.10-001)',
      triggerLevels: {
        watchLevel: 1000,
        warning: 2000,
        severeWarning: 3000,
      },
      baseUrl: 'https://ews1294.com/wp-json/api/v1',
    });
  });
});

describe('fetchEWSDataPointsByLocation', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps water-height responses to chart datapoints', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { timestamp: 1781650480, water_height: 2180 },
        { timestamp: 1781651274, water_height: 2170 },
      ],
    });

    await expect(
      fetchEWSDataPointsByLocation(
        'https://ews1294.com/wp-json/api/v1',
        Date.UTC(2026, 5, 16, 12),
        jest.fn(),
        410,
      ),
    ).resolves.toEqual([
      {
        location_id: 410,
        value: ['2026-06-16T22:54:40.000Z', 2180],
      },
      {
        location_id: 410,
        value: ['2026-06-16T23:07:54.000Z', 2170],
      },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /https:\/\/ews1294\.com\/wp-json\/api\/v1\/water-height\?.*location_id=410/,
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('retries transient water-height failures before returning empty data', async () => {
    jest.useFakeTimers();
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ timestamp: 1781650480, water_height: 2180 }],
      });

    const resultPromise = fetchEWSDataPointsByLocation(
      'https://ews1294.com/wp-json/api/v1',
      Date.UTC(2026, 5, 16, 12),
      jest.fn(),
      410,
    );

    await jest.runAllTimersAsync();
    await expect(resultPromise).resolves.toEqual([
      {
        location_id: 410,
        value: ['2026-06-16T22:54:40.000Z', 2180],
      },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

const testEndDate = 1611741612345;
const ret = [
  1609502400000, 1609588800000, 1609675200000, 1609761600000, 1609848000000,
  1609934400000, 1610020800000, 1610107200000, 1610193600000, 1610280000000,
  1610366400000, 1610452800000, 1610539200000, 1610625600000, 1610712000000,
  1610798400000, 1610884800000, 1610971200000, 1611057600000, 1611144000000,
  1611230400000, 1611316800000, 1611403200000, 1611489600000, 1611576000000,
  1611662400000, 1611748800000,
];
