import React, { memo, useMemo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { TIMELINE_ITEM_WIDTH } from '../../utils';
import { DateItemStyle } from '../types';

// Helper: Calculate how many dates in the timeline fall within this coverage window
const getCoverageWidthInDates = (
  dateItem: DateItem,
  dateRange: DateRangeType[],
): number => {
  if (!dateItem.startDate || !dateItem.endDate) {
    return 1; // Fallback to single date if no coverage defined
  }

  // Find all dates in the timeline between startDate and endDate
  return dateRange.filter(
    date =>
      date.value >= (dateItem.startDate || 0) &&
      date.value <= (dateItem.endDate || 0),
  ).length;
};

const StandardTimelineItem = memo(
  ({
    concatenatedLayers,
    currentDate,
    dateItemStyling,
    availabilityClass,
    isDateAvailable,
    dateRange,
    selectedDate,
  }: StandardTimelineItemProps) => {
    // Pre-compute the matching indices for all layers
    const displayDateMatches = useMemo(
      () =>
        concatenatedLayers.map(layerDates =>
          layerDates.findIndex(i =>
            datesAreEqualWithoutTime(i.displayDate, currentDate.value),
          ),
        ),
      [concatenatedLayers, currentDate.value],
    );

    const layerMatches = useMemo(() => {
      const queryDateMatches = concatenatedLayers.map(layerDates =>
        layerDates.findIndex(i =>
          datesAreEqualWithoutTime(i.queryDate, currentDate.value),
        ),
      );

      return displayDateMatches.map((displayDateMatch, layerIndex) =>
        queryDateMatches[layerIndex] > -1 &&
        !datesAreEqualWithoutTime(
          concatenatedLayers[layerIndex][displayDateMatch].queryDate,
          currentDate.value,
        )
          ? queryDateMatches[layerIndex]
          : displayDateMatch,
      );
    }, [concatenatedLayers, currentDate.value, displayDateMatches]);

    // Pre-compute coverage data for each layer's selected date (computed once per render)
    const layerCoverageData = useMemo(() => {
      return concatenatedLayers.map(layerDates => {
        const selectedDateItem = layerDates.find(item =>
          datesAreEqualWithoutTime(item.displayDate, selectedDate),
        );

        if (
          !selectedDateItem ||
          !selectedDateItem.startDate ||
          !selectedDateItem.endDate
        ) {
          return {
            selectedDateItem: null,
            coverageWidth: 0,
            firstDateIndex: -1,
          };
        }

        // Calculate coverage width once per layer
        const coverageWidth = getCoverageWidthInDates(
          selectedDateItem,
          dateRange,
        );

        // Find the first date index in the timeline that falls within coverage window
        const firstDateIndex = dateRange.findIndex(
          d => d.value >= selectedDateItem.startDate!,
        );

        return {
          selectedDateItem,
          coverageWidth,
          firstDateIndex,
        };
      });
    }, [concatenatedLayers, selectedDate, dateRange]);

    const isQueryDate = (date: DateItem): boolean =>
      datesAreEqualWithoutTime(date.queryDate, date.displayDate);

    return (
      <>
        {/* Add a small grey line to indicate where dates are overlapping */}
        {layerMatches.length >= 1 && isDateAvailable && (
          <div
            className={availabilityClass}
            style={{
              height: 4,
              // TODO - handle more than 3 layers
              top: 10 * Math.min((layerMatches?.length || 0) + 1, 3),
            }}
            key={Math.random()}
            role="presentation"
          />
        )}
        {layerMatches.map((idx, layerIndex) => {
          const layerDates = concatenatedLayers[layerIndex];
          const matchingDateItemInLayer: DateItem | undefined =
            idx > -1 ? layerDates[idx] : undefined;

          const coverageData = layerCoverageData[layerIndex];
          const { selectedDateItem, coverageWidth, firstDateIndex } =
            coverageData;

          // Check if current timeline date falls within the selected date's coverage window
          const isInSelectedCoverage =
            selectedDateItem &&
            currentDate.value >= (selectedDateItem.startDate || 0) &&
            currentDate.value <= (selectedDateItem.endDate || 0);

          // Check if this is the first date in timeline that falls within selected coverage
          const currentDateIndex = dateRange.findIndex(
            d => d.value === currentDate.value,
          );
          const isFirstDateInTimeline =
            selectedDateItem &&
            isInSelectedCoverage &&
            firstDateIndex !== -1 &&
            firstDateIndex === currentDateIndex;

          // Determine what to render
          const shouldRenderCoverageBar =
            isFirstDateInTimeline && coverageWidth > 0;
          const shouldRenderValidityTick =
            matchingDateItemInLayer !== undefined;

          // Skip if nothing to render
          if (!shouldRenderCoverageBar && !shouldRenderValidityTick) {
            return null;
          }

          return (
            <React.Fragment key={`layer-${layerIndex}-${currentDate.value}`}>
              {/* Render coverage bar only for the selected date's coverage period */}
              {shouldRenderCoverageBar && (
                <div
                  className={dateItemStyling[layerIndex].coverageBar}
                  style={{
                    width: coverageWidth * TIMELINE_ITEM_WIDTH,
                  }}
                  role="presentation"
                />
              )}

              {/* Render validity tick only if date has data */}
              {shouldRenderValidityTick && (
                <div
                  className={
                    isQueryDate(matchingDateItemInLayer!)
                      ? dateItemStyling[layerIndex].queryTick // Bold tick
                      : dateItemStyling[layerIndex].validityTick // Normal tick
                  }
                  role="presentation"
                />
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  },
);

export interface StandardTimelineItemProps {
  concatenatedLayers: DateItem[][];
  currentDate: DateRangeType;
  dateItemStyling: DateItemStyle[];
  availabilityClass?: string;
  isDateAvailable: boolean;
  dateRange: DateRangeType[];
  selectedDate: number;
}

export default StandardTimelineItem;
