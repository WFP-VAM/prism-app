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
  }: TimelineItemProps) => {
    const hasNextItemDirectionForward = (
      matchingDate: DateItem,
      layerDates: DateItem[],
    ): boolean => {
      return (
        layerDates.indexOf(matchingDate) !== 0 &&
        !!layerDates[layerDates.indexOf(matchingDate) - 1].isStartDate
      );
    };

    const hasNextItemDirectionBackward = (
      matchingDate: DateItem,
      layerDates: DateItem[],
    ): boolean => {
      return (
        layerDates.indexOf(matchingDate) !== layerDates.length - 1 &&
        !!layerDates[layerDates.indexOf(matchingDate) + 1].isEndDate
      );
    };

    const isStartOrEndDate = (date: DateItem): boolean => {
      return !!date.isEndDate || !!date.isStartDate;
    };

    return (
      <>
        {concatenatedLayers.map(
          (layerDates: DateItem[], layerIndex: number) => {
            const idx = binaryFind<DateItem>(
              layerDates,
              new Date(currentDate.value).setHours(0, 0, 0, 0),
              (i: DateItem) => new Date(i.displayDate).setHours(0, 0, 0, 0),
            );
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
                    isStartOrEndDate(matchingDateItemInLayer)
                      ? dateItemStyling[layerIndex].emphasis
                      : dateItemStyling[layerIndex].class
                  }`}
                  role="presentation"
                />
              </React.Fragment>
            );
          },
        )}
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
}

export default withStyles(styles)(TimelineItem);
