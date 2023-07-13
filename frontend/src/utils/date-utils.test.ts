import { generateDateItemsRange, StartEndDate } from './date-utils';

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
