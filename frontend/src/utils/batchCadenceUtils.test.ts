import { getDisabledCadences, resolveValidCadence } from './batchCadenceUtils';

describe('getDisabledCadences', () => {
  const singleMonthDates = [Date.UTC(2024, 0, 11)];

  test('disables monthly and quarterly when batch range spans one month', () => {
    const disabled = getDisabledCadences(singleMonthDates);
    expect(disabled.has('monthly')).toBe(true);
    expect(disabled.has('quarterly')).toBe(true);
  });

  test('does not disable cadences for scheduled export (no batch date range)', () => {
    expect(getDisabledCadences(singleMonthDates, 1, true)).toEqual(new Set());
  });
});

describe('resolveValidCadence', () => {
  const available = ['monthly', 'quarterly'] as const;

  test('keeps current cadence when enabled', () => {
    expect(resolveValidCadence([...available], new Set(), 'quarterly')).toBe(
      'quarterly',
    );
  });

  test('picks first enabled option when quarterly is disabled', () => {
    expect(
      resolveValidCadence([...available], new Set(['quarterly']), 'quarterly'),
    ).toBe('monthly');
  });

  test('falls back to every-n-dekads when period cadences are disabled', () => {
    expect(
      resolveValidCadence(
        ['every-n-dekads', 'monthly', 'quarterly'],
        new Set(['monthly', 'quarterly']),
        'quarterly',
      ),
    ).toBe('every-n-dekads');
  });
});
