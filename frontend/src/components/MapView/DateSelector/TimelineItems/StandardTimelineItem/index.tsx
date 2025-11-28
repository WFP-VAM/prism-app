;
import React, { memo, useMemo } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

const StandardTimelineItem = memo(
  ({
    concatenatedLayers,
    currentDate,
    dateItemStyling,
    isDateAvailable,
  }: StandardTimelineItemProps) => {
    // Pre-compute the matching indices for all layers
    const classes = useStyles();

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

    const hasNextItemDirectionForward = (
      _matchingDate: DateItem,
      _layerDates: DateItem[],
    ): boolean => false;

    const hasNextItemDirectionBackward = (
      _matchingDate: DateItem,
      _layerDates: DateItem[],
    ): boolean => false;

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

          if (!matchingDateItemInLayer) {
            return null;
          }

          return (
            <React.Fragment key={Math.random()}>
              {/* Add a directional arrow forward if previous item is a start date */}
              {hasNextItemDirectionForward(
                matchingDateItemInLayer,
                layerDates,
              ) && (
                <div
                  className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase}`}
                />
              )}

              {/* Add a directional arrow backward if next item is an end date */}
              {hasNextItemDirectionBackward(
                matchingDateItemInLayer,
                layerDates,
              ) && (
                <div
                  className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase} ${classes.layerDirectionBackwardBase}`}
                />
              )}

              {/* Add a bold square if queryDate (emphasis), normal otherwise */}
              <div
                className={`${
                  isQueryDate(matchingDateItemInLayer)
                    ? dateItemStyling[layerIndex].emphasis
                    : dateItemStyling[layerIndex].class
                }`}
                role="presentation"
              />
            </React.Fragment>
          );
        })}
      </>
    );
  },
);

const useStyles = makeStyles(() =>
  createStyles({
    layerDirectionBase: {
      display: 'block',
      position: 'absolute',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      height: '0px',
      zIndex: 1,
      left: 0,
      pointerEvents: 'none',
    },

    layerDirectionBackwardBase: {
      right: 0,
      transform: 'rotate(180deg)',
    },
  }),
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
}

export default StandardTimelineItem;
