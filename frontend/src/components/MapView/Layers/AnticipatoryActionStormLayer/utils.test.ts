import {
  formatInUTC,
  formatLandfallDate,
  formatLandfallEstimatedLeadtime,
  formatReportDate,
  getDateInUTC,
  isDateSameAsCurrentDate,
} from './utils';

describe('utils', () => {
  describe('getDateInUTC()', () => {
    it('returns an UTC date from a string composed of day and time part', () => {
      const date = '2024-03-01 06:00:00';
      const expectedDate = getDateInUTC(date, true);
      expect(expectedDate!.toISOString()).toEqual('2024-03-01T06:00:00.000Z');
    });

    it('returns an UTC date from a string composed of day part only', () => {
      const date = '2024-03-01';
      const expectedDate = getDateInUTC(date, false);
      expect(expectedDate!.toISOString()).toEqual('2024-03-01T00:00:00.000Z');
    });
  });

  describe('isCurrentDate()', () => {
    it('returns true when 2 dates are equal disregarding the time part', () => {
      expect(isDateSameAsCurrentDate('2024-03-01 06:00:00', '2024-03-01')).toBe(
        true,
      );
    });
  });

  describe('formatInUTC()', () => {
    const tests = [
      {
        date: new Date(Date.UTC(2024, 11, 5, 20, 50, 0)),
        expected: '5 - 8pm',
      },
      {
        date: new Date(Date.UTC(2024, 11, 5, 23, 59, 0)),
        expected: '5 - 11pm',
      },
      {
        date: new Date(Date.UTC(2024, 11, 5, 1, 0, 0)),
        expected: '5 - 1am',
      },
    ];
    it.each(tests)('returns UTC values of a UTC Date', ({ date, expected }) => {
      expect(formatInUTC(date, 'd - haaa')).toBe(expected);
    });
  });

  describe('formatLandfallDate()', () => {
    const tests = [
      {
        dateRange: ['2024-03-12 00:00:00', '2024-03-12 06:00:00'],
        expected: '2024-03-12 02:00 GMT+2',
      },
      {
        dateRange: ['2024-03-12 23:00:00', '2024-03-12 06:00:00'],
        expected: '2024-03-13 01:00 GMT+2',
      },
    ];
    it.each(tests)(
      'returns landfall estimated date in local time',
      ({ dateRange, expected }) => {
        expect(formatLandfallDate(dateRange)).toBe(expected);
      },
    );
  });

  describe('formatReportDate()', () => {
    const tests = [
      {
        date: '2024-03-12 00:00:00',
        expected: '2024-03-12 2am (GMT+2)',
      },
      {
        date: '2024-03-12 23:00:00',
        expected: '2024-03-13 1am (GMT+2)',
      },
    ];
    it.each(tests)(
      'returns report date in local time',
      ({ date, expected }) => {
        expect(formatReportDate(date)).toBe(expected);
      },
    );
  });

  describe('formatLandfallEstimatedLeadtime()', () => {
    const tests = [
      {
        landfallEstimatedTime: ['2024-03-12 01:00:00', '2024-03-12 06:00:00'],
        timelineDate: '2024-03-12',
        expected: '1 - 6 hrs',
      },
      {
        landfallEstimatedTime: ['2024-03-12 01:00:00', '2024-03-12 06:00:00'],
        timelineDate: '2024-03-11',
        expected: '25 - 30 hrs',
      },
      {
        landfallEstimatedTime: ['2024-03-12 01:00:00', '2024-03-12 06:00:00'],
        timelineDate: '2024-03-13',
        expected: '-',
      },
    ];

    it.each(tests)(
      'returns landfall estimated leadtime',
      ({ landfallEstimatedTime, timelineDate, expected }) => {
        expect(
          formatLandfallEstimatedLeadtime(landfallEstimatedTime, timelineDate),
        ).toBe(expected);
      },
    );
  });
});
