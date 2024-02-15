import {
  binaryFind,
  generateDateItemsRange,
  generateDatesRange,
  getFormattedDate,
  getTimeInMilliseconds,
  StartEndDate,
} from './date-utils';

describe('Test buildDateItemsFromStartEndDates', () => {
  test('should return empty', () => {
    // Act
    expect(generateDateItemsRange([])).toEqual([]);
  });

  test('should return an array of DateItems for a 5-day range', () => {
    // Arrange
    const startDate0 = new Date('2018-02-01').getTime();
    const endDate0 = new Date('2018-02-05').getTime();
    const dateRanges: StartEndDate[] = [
      {
        startDate: startDate0,
        endDate: endDate0,
      },
    ];

    // Act
    expect(generateDateItemsRange(dateRanges)).toEqual([
      {
        displayDate: new Date('2018-02-01').getTime(),
        queryDate: startDate0,
        isStartDate: true,
      },
      {
        displayDate: new Date('2018-02-02').getTime(),
        queryDate: startDate0,
      },
      {
        displayDate: new Date('2018-02-03').getTime(),
        queryDate: startDate0,
      },
      {
        displayDate: new Date('2018-02-04').getTime(),
        queryDate: startDate0,
      },
      {
        displayDate: new Date('2018-02-05').getTime(),
        queryDate: startDate0,
        isEndDate: true,
      },
    ]);
  });
});

describe('Binary search in ordered arrays of timestamps', () => {
  test('should return the index of found element', () => {
    const arr = [
      1701160000000,
      1702160000000,
      1703160000000,
      1703460000000,
      1705160000000,
      1705395000000,
      1706160000000,
      1715160000000,
      1725160000000,
      1735160000000,
    ];
    arr.forEach((elem, i) => {
      const idx = binaryFind<number>(arr, elem, x => x);
      expect(idx).toEqual(i);
    });
    // look for missing value
    expect(binaryFind<number>(arr, 42, x => x)).toEqual(-1);
  });
});

const defaultFormateTests = [
  [1641158400000, '2022-01-02'],
  [1642387200000, '2022-01-17'],
  [1644556800000, '2022-02-11'],
  [1644710400000, '2022-02-13'],
  [1643059200000, '2022-01-24'],
  [1643932800000, '2022-02-04'],
  [1642060800000, '2022-01-13'],
  [1643222400000, '2022-01-26'],
  [1644307200000, '2022-02-08'],
  [1641312000000, '2022-01-04'],
  [1643145600000, '2022-01-25'],
  [1642022400000, '2022-01-12'],
  [1642137600000, '2022-01-14'],
  [1642214400000, '2022-01-15'],
  [1644864000000, '2022-02-14'],
  [1644979200000, '2022-02-16'],
  [1643356800000, '2022-01-28'],
  [1642512000000, '2022-01-18'],
  [1644393600000, '2022-02-09'],
  [1644614400000, '2022-02-11'],
];

test.each(defaultFormateTests)(
  'Test getFormattedDate default',
  (input, expected) => {
    expect(expected).toEqual(getFormattedDate(input, 'default'));
  },
);

const snakeFormateTests = [
  [1641158400000, '2022_01_02'],
  [1642387200000, '2022_01_17'],
  [1644556800000, '2022_02_11'],
  [1644710400000, '2022_02_13'],
  [1643059200000, '2022_01_24'],
  [1643932800000, '2022_02_04'],
  [1642060800000, '2022_01_13'],
  [1643222400000, '2022_01_26'],
  [1644307200000, '2022_02_08'],
  [1641312000000, '2022_01_04'],
  [1643145600000, '2022_01_25'],
  [1642022400000, '2022_01_12'],
  [1642137600000, '2022_01_14'],
  [1642214400000, '2022_01_15'],
  [1644864000000, '2022_02_14'],
  [1644979200000, '2022_02_16'],
  [1643356800000, '2022_01_28'],
  [1642512000000, '2022_01_18'],
  [1644393600000, '2022_02_09'],
  [1644614400000, '2022_02_11'],
];

test.each(snakeFormateTests)(
  'Test getFormattedDate snake',
  (input, expected) => {
    expect(expected).toEqual(getFormattedDate(input, 'snake'));
  },
);

const isoDates = [
  ['2024-02-02T13:44:24.164Z', 1706881464164],
  ['2024-03-15T08:30:45.789Z', 1710491445789],
  ['2024-04-28T16:12:30.502Z', 1714320750502],
  ['2024-05-10T10:20:15.321Z', 1715336415321],
  ['2024-06-23T21:05:40.876Z', 1719176740876],
  ['2024-07-06T14:28:56.435Z', 1720276136435],
  ['2024-08-19T09:16:27.653Z', 1724058987653],
  ['2024-09-01T12:40:18.924Z', 1725194418924],
  ['2024-10-14T18:55:33.701Z', 1728932133701],
  ['2024-11-26T23:09:47.480Z', 1732662587480],
  ['2025-01-08T03:30:22.115Z', 1736307022115],
  ['2025-02-21T06:14:11.992Z', 1740118451992],
  ['2025-03-06T19:27:36.875Z', 1741289256875],
  ['2025-04-19T08:09:14.222Z', 1745050154222],
  ['2025-05-02T13:52:09.557Z', 1746193929557],
  ['2025-06-15T17:36:55.333Z', 1750009015333],
  ['2025-07-28T10:45:29.987Z', 1753699529987],
  ['2025-08-10T22:08:03.654Z', 1754863683654],
  ['2025-09-23T05:51:48.765Z', 1758606708765],
  ['2025-10-06T14:23:59.400Z', 1759760639400],
];

test.each(isoDates)('Test getTimeInMilliseconds', (input, expected) => {
  expect(expected).toEqual(getTimeInMilliseconds(input as string));
});

test('Test generateDatesRange', () => {
  const ret = generateDatesRange(
    new Date('2023-02-02'),
    new Date('2023-02-13'),
  );
  expect(ret).toEqual([
    1675296000000,
    1675382400000,
    1675468800000,
    1675555200000,
    1675641600000,
    1675728000000,
    1675814400000,
    1675900800000,
    1675987200000,
    1676073600000,
    1676160000000,
    1676246400000,
  ]);
});
