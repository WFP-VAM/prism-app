import { generateDateItemsBetweenForRanges } from './date-utils';

describe('Test buildDateItemsFromStartEndDates', () => {
  test('should return empty', () => {
    // Act
    expect(generateDateItemsBetweenForRanges([])).toEqual([]);
  });

  test('should return and array of DateItems for one range of 5 days', () => {
    // Arrange
    const startDate0 = new Date('2018-02-01');
    const endDate0 = new Date('2018-02-05');
    const dateRanges: {
      startDate: Date;
      endDate: Date;
    }[] = [
      {
        startDate: startDate0,
        endDate: endDate0,
      },
    ];

    // Act
    expect(generateDateItemsBetweenForRanges(dateRanges)).toEqual([
      {
        displayDate: new Date('2018-02-01').getTime(),
        queryDate: startDate0.getTime(),
        isStartDate: true,
      },
      {
        displayDate: new Date('2018-02-02').getTime(),
        queryDate: startDate0.getTime(),
      },
      {
        displayDate: new Date('2018-02-03').getTime(),
        queryDate: startDate0.getTime(),
      },
      {
        displayDate: new Date('2018-02-04').getTime(),
        queryDate: startDate0.getTime(),
      },
      {
        displayDate: new Date('2018-02-05').getTime(),
        queryDate: startDate0.getTime(),
        isEndDate: true,
      },
    ]);
  });
});
