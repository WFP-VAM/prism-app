import { DatesPropagation } from 'config/types';
import { generateIntermediateDateItemFromValidity } from './server-utils';

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
        days: 10,
        mode: DatesPropagation.FORWARD,
      },
    };

    const output = generateIntermediateDateItemFromValidity(layer);
    expect(output).toEqual([
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[0],
        isStartDate: true,
        isEndDate: false,
      },
      {
        displayDate: new Date('2023-12-02').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-03').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-04').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-05').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-06').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-07').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-08').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-09').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-10').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-11').setHours(12, 0),
        queryDate: layer.dates[1],
        isStartDate: true,
        isEndDate: false,
      },
      {
        displayDate: new Date('2023-12-12').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-13').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-14').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-15').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-16').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-17').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-18').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-19').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-20').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-21').setHours(12, 0),
        queryDate: layer.dates[2],
        isStartDate: true,
        isEndDate: false,
      },
      {
        displayDate: new Date('2023-12-22').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-23').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-24').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-25').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-26').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-27').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-28').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-29').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-30').setHours(12, 0),
        queryDate: layer.dates[2],
      },
      {
        displayDate: new Date('2023-12-31').setHours(12, 0),
        queryDate: layer.dates[2],
      },
    ]);
  });

  test('should return correct dates with backwards propagation', () => {
    const layer = {
      name: 'myd11a2_taa_dekad',
      dates: [
        new Date('2023-12-01').setHours(12, 0),
        new Date('2023-12-11').setHours(12, 0),
      ],
      validity: {
        days: 10,
        mode: DatesPropagation.BACKWARD,
      },
    };
    const output = generateIntermediateDateItemFromValidity(layer);
    expect(output).toEqual([
      {
        displayDate: new Date('2023-11-21').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-22').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-23').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-24').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-25').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-26').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-27').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-28').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-29').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-11-30').setHours(12, 0),
        queryDate: layer.dates[0],
      },
      {
        displayDate: new Date('2023-12-01').setHours(12, 0),
        queryDate: layer.dates[0],
        isStartDate: false,
        isEndDate: true,
      },
      {
        displayDate: new Date('2023-12-02').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-03').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-04').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-05').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-06').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-07').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-08').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-09').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-10').setHours(12, 0),
        queryDate: layer.dates[1],
      },
      {
        displayDate: new Date('2023-12-11').setHours(12, 0),
        queryDate: layer.dates[1],
        isStartDate: false,
        isEndDate: true,
      },
    ]);
  });
});
