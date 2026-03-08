import * as DateSelectorUtils from './utils';

const jan21 = new Date('2024-01-21T12:00:00Z').getTime();
const feb1 = new Date('2024-02-01T12:00:00Z').getTime();
const feb11 = new Date('2024-02-11T12:00:00Z').getTime();

describe('DateSelector helpers', () => {
  test('defaults to latest compatible date when no selected date exists', () => {
    const getDefaultCompatibleDate = (DateSelectorUtils as any)
      .getDefaultCompatibleDate;

    expect(getDefaultCompatibleDate).toBeDefined();
    expect(getDefaultCompatibleDate([jan21, feb1, feb11], undefined)).toBe(
      feb11,
    );
  });
});
