import { getPrintPreviewDate } from './printPreviewDate';

const feb1 = Date.UTC(2026, 1, 1, 12);
const feb10 = Date.UTC(2026, 1, 10, 12);

describe('getPrintPreviewDate', () => {
  test('uses selected map date when batch maps toggle is off, even with stale batch dates', () => {
    expect(
      getPrintPreviewDate(
        {
          shouldEnableBatchMaps: true,
          filteredBatchDates: [feb1],
          toggles: { batchMapsVisibility: false },
        },
        feb10,
      ),
    ).toBe(feb10);
  });

  test('uses last batch date when batch maps are enabled', () => {
    expect(
      getPrintPreviewDate(
        {
          shouldEnableBatchMaps: true,
          filteredBatchDates: [feb1, feb10],
          toggles: { batchMapsVisibility: true },
        },
        feb1,
      ),
    ).toBe(feb10);
  });

  test('falls back to selected date when there are no batch dates or no config', () => {
    expect(
      getPrintPreviewDate(
        {
          shouldEnableBatchMaps: true,
          filteredBatchDates: [],
          toggles: { batchMapsVisibility: true },
        },
        feb10,
      ),
    ).toBe(feb10);
    expect(getPrintPreviewDate(undefined, feb10)).toBe(feb10);
  });
});
