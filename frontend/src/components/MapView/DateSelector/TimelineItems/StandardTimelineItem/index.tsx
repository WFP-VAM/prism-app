import React, { memo, useMemo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { TIMELINE_ITEM_WIDTH } from '../../utils';
import {
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
  LIGHT_ORANGE_HEX,
  DARK_BLUE_HEX,
  DARK_GREEN_HEX,
  DARK_ORANGE_HEX,
} from '../utils';

// Helper: Get the color and top position for a given layer index
const getLayerStyles = (layerIndex: number) => {
  const styles = [
    { color: LIGHT_BLUE_HEX, emphasisColor: DARK_BLUE_HEX, top: 0 },
    { color: LIGHT_GREEN_HEX, emphasisColor: DARK_GREEN_HEX, top: 10 },
    { color: LIGHT_ORANGE_HEX, emphasisColor: DARK_ORANGE_HEX, top: 20 },
  ];
  return styles[layerIndex] || styles[0];
};

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

    const isQueryDate = (date: DateItem): boolean =>
      datesAreEqualWithoutTime(date.queryDate, date.displayDate);

    return (
      <>
        {/* Add a small grey line to indicate where dates are overlapping */}
        {layerMatches.length >= 1 && isDateAvailable && (
          <div
            className={dateItemStyling[3].class}
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

          // Find the coverage window for the selected date
          const selectedDateItem = layerDates.find(item =>
            datesAreEqualWithoutTime(item.displayDate, selectedDate),
          );

          // Check if current timeline date falls within the selected date's coverage window
          const isInSelectedCoverage =
            selectedDateItem &&
            currentDate.value >= (selectedDateItem.startDate || 0) &&
            currentDate.value <= (selectedDateItem.endDate || 0);

          // Check if this is the first date in timeline that falls within selected coverage
          const isFirstDateInTimeline =
            selectedDateItem &&
            isInSelectedCoverage &&
            dateRange.findIndex(
              d => d.value >= (selectedDateItem.startDate || 0),
            ) === dateRange.findIndex(d => d.value === currentDate.value);

          // Calculate coverage width using the SELECTED date's coverage window
          const coverageWidth =
            selectedDateItem && isInSelectedCoverage
              ? getCoverageWidthInDates(selectedDateItem, dateRange)
              : 0;

          // Determine what to render
          const shouldRenderCoverageBar =
            isFirstDateInTimeline && coverageWidth > 0;
          const shouldRenderValidityTick =
            matchingDateItemInLayer !== undefined;

          // Skip if nothing to render
          if (!shouldRenderCoverageBar && !shouldRenderValidityTick) {
            return null;
          }

          // Get layer styles once to avoid redundant calls
          const layerStyles = getLayerStyles(layerIndex);
          const isQuery = isQueryDate(matchingDateItemInLayer!);

          return (
            <React.Fragment key={`layer-${layerIndex}-${currentDate.value}`}>
              {/* Render coverage bar only for the selected date's coverage period */}
              {shouldRenderCoverageBar && (
                <div
                  style={{
                    position: 'absolute',
                    height: 10,
                    pointerEvents: 'none',
                    opacity: 0.8,
                    top: layerStyles.top,
                    left: 0,
                    backgroundColor: layerStyles.color,
                    width: coverageWidth * TIMELINE_ITEM_WIDTH,
                  }}
                  role="presentation"
                />
              )}

              {/* Render validity tick only if date has data */}
              {shouldRenderValidityTick && (
                <div
                  style={{
                    position: 'absolute',
                    height: 10,
                    width: TIMELINE_ITEM_WIDTH,
                    pointerEvents: 'none',
                    opacity: isQuery ? 1 : 0.8,
                    top: layerStyles.top,
                    backgroundColor: isQuery
                      ? layerStyles.emphasisColor
                      : layerStyles.color,
                  }}
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
  dateItemStyling: {
    class: string;
    color: string;
    layerDirectionClass?: string;
    emphasis?: string;
  }[];
  isDateAvailable: boolean;
  dateRange: DateRangeType[];
  selectedDate: number;
}

export default StandardTimelineItem;
