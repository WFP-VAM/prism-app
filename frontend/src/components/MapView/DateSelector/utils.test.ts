import * as DateSelectorUtils from './utils';

const jan21 = new Date('2024-01-21T12:00:00Z').getTime();
const feb1 = new Date('2024-02-01T12:00:00Z').getTime();
const feb7 = new Date('2024-02-07T12:00:00Z').getTime();
const feb11 = new Date('2024-02-11T12:00:00Z').getTime();

describe('DateSelector shared compatible dates helpers', () => {
  test('defaults to latest compatible date when no selected date exists', () => {
    const getDefaultCompatibleDate = (DateSelectorUtils as any)
      .getDefaultCompatibleDate;

    expect(getDefaultCompatibleDate).toBeDefined();
    expect(getDefaultCompatibleDate([jan21, feb1, feb11], undefined)).toBe(
      feb11,
    );
  });

  test('navigates to previous compatible date from the shared timeline', () => {
    const getAdjacentCompatibleDate = (DateSelectorUtils as any)
      .getAdjacentCompatibleDate;

    expect(getAdjacentCompatibleDate).toBeDefined();
    expect(getAdjacentCompatibleDate([jan21, feb1, feb11], feb1, 'back')).toBe(
      jan21,
    );
    expect(
      getAdjacentCompatibleDate([jan21, feb1, feb11], feb1, 'forward'),
    ).toBe(feb11);
  });

  test('finds previous observation date across mixed layer windows', () => {
    const getPreviousObservationDate = (DateSelectorUtils as any)
      .getPreviousObservationDate;

    expect(getPreviousObservationDate).toBeDefined();

    const layers = [
      {
        id: 'rainfall_agg_3month',
        type: 'wms',
        dateItems: [
          { displayDate: jan21, queryDate: jan21 },
          { displayDate: jan21 + 24 * 60 * 60 * 1000, queryDate: jan21 },
          { displayDate: feb1, queryDate: feb1 },
          { displayDate: feb7, queryDate: feb1 },
          { displayDate: feb11, queryDate: feb11 },
        ],
      },
      {
        id: 'ch_phase',
        type: 'admin_level_data',
        dateItems: [
          { displayDate: jan21, queryDate: jan21 },
          { displayDate: jan21 + 24 * 60 * 60 * 1000, queryDate: jan21 },
          { displayDate: feb1, queryDate: feb1 },
          { displayDate: feb7, queryDate: feb1 },
        ],
      },
    ];

    expect(getPreviousObservationDate(layers, feb7)).toBe(jan21);
  });

  test('finds next observation date across mixed layer windows', () => {
    const getNextObservationDate = (DateSelectorUtils as any)
      .getNextObservationDate;

    expect(getNextObservationDate).toBeDefined();

    const layers = [
      {
        id: 'rainfall_agg_3month',
        type: 'wms',
        dateItems: [
          { displayDate: jan21, queryDate: jan21 },
          { displayDate: jan21 + 24 * 60 * 60 * 1000, queryDate: jan21 },
          { displayDate: feb1, queryDate: feb1 },
          { displayDate: feb7, queryDate: feb1 },
          { displayDate: feb11, queryDate: feb11 },
        ],
      },
      {
        id: 'ch_phase',
        type: 'admin_level_data',
        dateItems: [
          { displayDate: jan21, queryDate: jan21 },
          { displayDate: jan21 + 24 * 60 * 60 * 1000, queryDate: jan21 },
          { displayDate: feb1, queryDate: feb1 },
          { displayDate: feb7, queryDate: feb1 },
        ],
      },
    ];

    expect(getNextObservationDate(layers, jan21)).toBe(feb1);
  });
});
