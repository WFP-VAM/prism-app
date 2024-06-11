import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { memo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { binaryFind } from 'utils/date-utils';

const TimelineItem = memo(
  ({
    classes,
    concatenatedLayers,
    currentDate,
    dateItemStyling,
    isDateAvailable,
  }: TimelineItemProps) => {
    // Pre-compute the matching indices for all layers
    const layerMatches = concatenatedLayers.map(layerDates => {
      return binaryFind<DateItem>(
        layerDates,
        new Date(currentDate.value).setUTCHours(0, 0, 0, 0),
        (i: DateItem) => new Date(i.displayDate).setUTCHours(0, 0, 0, 0),
      );
    });

    const hasNextItemDirectionForward = (
      matchingDate: DateItem,
      layerDates: DateItem[],
    ): boolean => {
      return false;
    };

    const hasNextItemDirectionBackward = (
      matchingDate: DateItem,
      layerDates: DateItem[],
    ): boolean => {
      return false;
    };

    const isQueryDate = (date: DateItem): boolean => {
      return date.queryDate === date.displayDate;
    };

    return (
      <>
        {/* Add a small grey line to indicate where dates are overlapping */}
        {layerMatches.length >= 1 && isDateAvailable && (
          <div
            className={dateItemStyling[3].class}
            style={{
              height: 4,
              // TODO - handle more than 3 layers
              top: 10 * Math.min(layerMatches?.length + 1, 3),
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

              {/* Add a bold square if start or end date (emphasis), normal otherwise */}
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

const styles = () =>
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
  });

export interface TimelineItemProps extends WithStyles<typeof styles> {
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

export default withStyles(styles)(TimelineItem);
