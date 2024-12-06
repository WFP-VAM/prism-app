import { getDateInUTC, isDateSameAsCurrentDate } from './utils';

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
});
