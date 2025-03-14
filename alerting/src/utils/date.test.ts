import { formatDate } from './date';

describe('date utils', () => {
  describe('formatDate()', () => {
    it('returns the expected date for DD/MM/YYYY HH:mm UTC format', () => {
      const result = formatDate('2025-03-18T12:00:00Z', 'DD/MM/YYYY HH:mm UTC');
      expect(result).toEqual('18/03/2025 12:00 UTC');
    });

    it('returns the expected date for YYYY-MM-DD format', () => {
      const result = formatDate('2025-03-18T12:00:00Z', 'YYYY-MM-DD');
      expect(result).toEqual('2025-03-18');
    });

    it('returns the expected date for YYYY-MM-DD HH:mm format', () => {
      const result = formatDate('2025-03-18T12:00:00Z', 'YYYY-MM-DD HH:mm');
      expect(result).toEqual('2025-03-18 12:00');
    });

    it('returns the expected date for YYYY-MM-DD HH:mm:ss format', () => {
      const result = formatDate('2025-03-18T12:00:00Z', 'YYYY-MM-DD HH:mm:ss');
      expect(result).toEqual('2025-03-18 12:00:00');
    });

    it('throws an error for unsupported formats', () => {
      expect(() => {
        formatDate('2025-03-18T12:00:00Z', 'INVALID_FORMAT');
      }).toThrow('Unsupported date format');
    });
  });
});
