import { formatDateToUTC } from './date';

describe('date utils', () => {
  describe('formatDateToUTC()', () => {
    it('returns the expected date', () => {
      const result = formatDateToUTC('2025-03-02T12:00:00Z');
      expect(result).toEqual('02/03/2025 12:00 UTC');
    });
  });
});
