import {
  DatesPropagation,
  ReferenceDateTimestamp,
  SeasonBounds,
} from 'config/types';
import timezoneMock from 'timezone-mock';
import {
  generateIntermediateDateItemFromValidity,
  getStaticRasterDataCoverage,
  getAdminLevelDataCoverage,
} from './server-utils';
import { timezones } from '../../test/helpers';
import { getSeasonBounds, SEASON_MAP } from './date-utils';

// NOTE: all timestamps are created in the LOCAL timezone (as per js docs), so that
// these tests should pass for any TZ.

describe('Test generateIntermediateDateItemFromValidity', () => {
  test('should return correct dates with forward propagation', () => {
    const layer = {
      name: 'myd11a2_taa_dekad',
      dates: [
        new Date('2023-12-01').setHours(12, 0),
        new Date('2023-12-11').setHours(12, 0),
        new Date('2023-12-21').setHours(12, 0),
      ],
      validity: {
        forward: 10,
        mode: DatesPropagation.DAYS,
      },
    };

    const output = generateIntermediateDateItemFromValidity(
      layer.dates as ReferenceDateTimestamp[],
      layer.validity,
    );

    expect(output).toEqual([
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-02').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-03').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-04').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-05').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-06').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-07').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-08').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-09').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-10').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-11').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: layer.dates[0],
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-11').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-12').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-13').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-14').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-15').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-16').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-17').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-18').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-19').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-20').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-21').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: layer.dates[1],
        endDate: new Date('2023-12-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-21').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-22').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-23').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-24').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-25').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-26').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-27').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-28').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-29').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-30').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-31').setHours(12, 0),
        queryDate: layer.dates[2],
        startDate: layer.dates[2],
        endDate: new Date('2023-12-31').setHours(12, 0),
      },
    ]);
  });

  test('should return correct dates with backward propagation', () => {
    const layer = {
      name: 'myd11a2_taa_dekad',
      dates: [
        new Date('2023-12-01').setHours(12, 0),
        new Date('2023-12-11').setHours(12, 0),
      ],
      validity: {
        backward: 10,
        mode: DatesPropagation.DAYS,
      },
    };
    const output = generateIntermediateDateItemFromValidity(
      layer.dates as ReferenceDateTimestamp[],
      layer.validity,
    );
    expect(output).toEqual([
      {
        displayDate: new Date('2023-11-21').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-22').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-23').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-24').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-25').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-26').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-27').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-28').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-29').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-30').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
        endDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
        endDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-02').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-03').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-04').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-05').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-06').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-07').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-08').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-09').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-10').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-11').setHours(12, 0),
        queryDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
        endDate: new Date('2023-12-11').setHours(12, 0),
      },
    ]);
  });

  test('should return correct dates with backwards propagation and dekad', () => {
    const layer = {
      name: 'myd11a2_taa_dekad',
      dates: [
        new Date('2023-12-01').setHours(12, 0),
        new Date('2023-12-11').setHours(12, 0),
      ],
      validity: {
        backward: 1,
        mode: DatesPropagation.DEKAD,
      },
    };
    const output = generateIntermediateDateItemFromValidity(
      layer.dates as ReferenceDateTimestamp[],
      layer.validity,
    );
    expect(output).toEqual([
      {
        displayDate: new Date('2023-11-21').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-22').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-23').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-24').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-25').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-26').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-27').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-28').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-29').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-11-30').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[0],
        endDate: layer.dates[0],
        startDate: new Date('2023-11-21').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-02').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-03').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-04').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-05').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-06').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-07').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-08').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-09').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-10').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
      {
        displayDate: new Date('2023-12-11').setHours(12, 0),
        queryDate: layer.dates[1],
        endDate: layer.dates[1],
        startDate: new Date('2023-12-01').setHours(12, 0),
      },
    ]);
  });

  test('should return correct dates for seasons', () => {
    const dates = ['2023-01-01'];
    const layer = {
      name: 'myd11a2_taa_season',
      dates: dates.map(date => new Date(date).setHours(12, 0)),
      validity: {
        mode: DatesPropagation.SEASON,
      },
    };
    const output = generateIntermediateDateItemFromValidity(
      layer.dates as ReferenceDateTimestamp[],
      layer.validity,
    );
    const startOfWinter = new Date(
      new Date(dates[0]).getFullYear(),
      SEASON_MAP[0][0],
      1,
    );
    const endOfWinter = new Date(
      new Date(dates[0]).getFullYear(),
      SEASON_MAP[0][1] + 1,
      0,
    );

    const daysInSeason: Date[] = [];
    while (
      !daysInSeason[daysInSeason.length - 1] ||
      daysInSeason[daysInSeason.length - 1] < endOfWinter
    ) {
      if (daysInSeason.length === 0) {
        // eslint-disable-next-line fp/no-mutating-methods
        daysInSeason.push(startOfWinter);
      } else {
        // eslint-disable-next-line fp/no-mutating-methods
        daysInSeason.push(
          new Date(
            new Date(startOfWinter).setDate(
              startOfWinter.getDate() + daysInSeason.length,
            ),
          ),
        );
      }
    }

    const { start, end } = getSeasonBounds(
      new Date(daysInSeason[0]),
    ) as SeasonBounds;
    const adjustedEnd = new Date(end).setDate(0);
    expect(output).toEqual(
      daysInSeason.map(date => ({
        displayDate: new Date(date).getTime(),
        queryDate: new Date(dates[0]).getTime(),
        endDate: new Date(adjustedEnd).getTime(),
        startDate: new Date(start).getTime(),
      })),
    );
  });

  test('should return correct dates for custom seasons', () => {
    const dates = ['2023-01-01'];
    const layer = {
      name: 'myd11a2_taa_season',
      dates: dates.map(date => new Date(date).setHours(12, 0)),
      validity: {
        mode: DatesPropagation.SEASON,
        seasons: [
          {
            start: '01-August',
            end: '28-February',
          },
        ],
      },
    };
    const output = generateIntermediateDateItemFromValidity(
      layer.dates as ReferenceDateTimestamp[],
      layer.validity,
    );
    const startOfWetSeason = new Date(
      `${parseInt(dates[0].split('-')[0], 10) - 1}-${layer.validity.seasons[0].start}`,
    );
    const endOfWetSeason = new Date(
      `${dates[0].split('-')[0]}-${layer.validity.seasons[0].end}`,
    );

    const daysInSeason: Date[] = [];
    while (
      !daysInSeason[daysInSeason.length - 1] ||
      daysInSeason[daysInSeason.length - 1] < endOfWetSeason
    ) {
      if (daysInSeason.length === 0) {
        // eslint-disable-next-line fp/no-mutating-methods
        daysInSeason.push(startOfWetSeason);
      } else {
        // eslint-disable-next-line fp/no-mutating-methods
        daysInSeason.push(
          new Date(
            new Date(startOfWetSeason).setDate(
              startOfWetSeason.getDate() + daysInSeason.length,
            ),
          ),
        );
      }
    }

    const { start, end } = getSeasonBounds(
      new Date(dates[0]),
      layer.validity.seasons,
    ) as SeasonBounds;

    expect(output).toEqual(
      daysInSeason.map(date => ({
        displayDate: new Date(date).setUTCHours(12),
        queryDate: new Date(start).getTime(),
        endDate: new Date(end).getTime(),
        startDate: new Date(start).getTime(),
      })),
    );
  });
});

describe('getStaticRasterDataCoverage', () => {
  const layer = {
    id: 'flood_events',
    type: 'static_raster',
    title: 'Flood events over time',
    baseUrl:
      'https://prism-raster-tiles.s3.amazonaws.com/ssd-flood-events/test/{YYYY_MM_DD}/{z}/{x}/{y}.png',
    dates: ['2022-12-01', '2022-12-11'],
    opacity: 1,
    legendText: 'Flood events',
    minZoom: 0,
    maxZoom: 12,
    legend: [
      {
        value: 0,
        label: '0',
        color: '#000000',
      },
      {
        value: 1,
        label: '1',
        color: '#0f02a7',
      },
      {
        value: 3,
        label: '3',
        color: '#2429f4',
      },
      {
        value: 7,
        label: '7',
        color: '#2d6bfd',
      },
      {
        value: 15,
        label: '15',
        color: '#36a3fd',
      },
      {
        value: 31,
        label: '31',
        color: '#2cd8fa',
      },
      {
        value: 32,
        label: '32',
        color: '#580100',
      },
      {
        value: 48,
        label: '48',
        color: '#9d0400',
      },
      {
        value: 56,
        label: '56',
        color: '#e60f00',
      },
      {
        value: 60,
        label: '60',
        color: '#fc7600',
      },
      {
        value: 62,
        label: '62',
        color: '#ffbe00',
      },
      {
        value: 63,
        label: '63',
        color: '#ffffff',
      },
      {
        value: 101,
        label: '101',
        color: '#393939',
      },
      {
        value: 102,
        label: '102',
        color: '#5a5a5a',
      },
      {
        value: 103,
        label: '103',
        color: '#7d7d7d',
      },
      {
        value: 104,
        label: '104',
        color: '#a2a2a2',
      },
      {
        value: 105,
        label: '105',
        color: '#c8c8c8',
      },
    ],
  };

  const result = [1669852800000, 1670716800000];

  afterAll(() => {
    timezoneMock.unregister();
  });

  test.each(timezones)('Should work with %s', timezone => {
    timezoneMock.register(timezone);
    const ret = getStaticRasterDataCoverage(layer as any);

    expect(ret).toEqual(result);
  });
});

describe('getAdminLevelDataCoverage', () => {
  const layer = {
    id: 'ch_urban_pop3_5',
    type: 'admin_level_data',
    title: 'Urban areas - population in phase 3 to 5',
    path: 'data/cameroon/ch/urb_admin2_{YYYY_MM_DD}.json',
    dates: ['2022-02-01', '2022-06-01'],
    adminLevel: 2,
    dataField: 'calc_pop_ph3_5_admin2',
    adminCode: 'adm2_pcod2',
    opacity: 0.9,
    featureInfoProps: {
      start_date: {
        type: 'text',
        dataTitle: 'Reference period start',
      },
      end_date: {
        type: 'text',
        dataTitle: 'Reference period end',
      },
    },
    legend: [
      {
        value: 1,
        label: '< 10,000',
        color: '#fee5d9',
      },
      {
        value: 10000,
        label: '10,000 - 20,000',
        color: '#fcbba1',
      },
      {
        value: 20000,
        label: '20,000 - 30,000',
        color: '#fc9272',
      },
      {
        value: 30000,
        label: '30,000 - 40,000',
        color: '#fb6a4a',
      },
      {
        value: 40000,
        label: '40,000 - 50,000',
        color: '#ef3b2c',
      },
      {
        value: 50000,
        label: '50,000 - 75,000',
        color: '#cb181d',
      },
      {
        value: 75000,
        label: '> 75,000',
        color: '#99000d',
      },
    ],
    legendText: 'Urban areas - population in phase 3 to 5',
  };

  const result = [1643673600000, 1654041600000];

  afterAll(() => {
    timezoneMock.unregister();
  });

  test.each(timezones)('Should work with %s', timezone => {
    timezoneMock.register(timezone);
    const ret = getAdminLevelDataCoverage(layer as any);

    expect(ret).toEqual(result);
  });
});
