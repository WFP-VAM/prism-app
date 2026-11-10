type PreviewDateConfig = {
  shouldEnableBatchMaps?: boolean;
  filteredBatchDates?: number[];
  toggles?: { batchMapsVisibility?: boolean };
};

/**
 * Date shown in the print preview title/footer. Batch dates are only used when
 * batch maps are actually enabled; otherwise a stale batch range would override
 * the date selected on the main map.
 */
export function getPrintPreviewDate(
  printConfig: PreviewDateConfig | undefined,
  selectedDate: number | undefined,
): number | undefined {
  const { shouldEnableBatchMaps, filteredBatchDates, toggles } =
    printConfig ?? {};
  if (
    shouldEnableBatchMaps &&
    toggles?.batchMapsVisibility &&
    filteredBatchDates &&
    filteredBatchDates.length > 0
  ) {
    return filteredBatchDates[filteredBatchDates.length - 1];
  }
  return selectedDate;
}
