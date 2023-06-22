import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { memo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from '../../../../../config/types';
import { datesAreEqualWithoutTime } from '../../../../../utils/date-utils';

const TimelineItem = memo(
  ({
    classes,
    concatenatedLayers,
    currentDate,
    dateItemStyling,
  }: TimelineItemProps) => {
    return (
      <>
        {concatenatedLayers.map(
          (layerDates: DateItem[], layerIndex: number) => {
            // TODO: fix not really efficient algorithm
            const matchingDateItemInLayer = layerDates.find(f =>
              datesAreEqualWithoutTime(f.displayDate, currentDate.value),
            );

            if (!matchingDateItemInLayer) {
              return null;
            }

            return (
              <React.Fragment key={Math.random()}>
                {layerDates.indexOf(matchingDateItemInLayer) !== 0 &&
                  layerDates[layerDates.indexOf(matchingDateItemInLayer) - 1]
                    .isStartDate && (
                    <div
                      className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase}`}
                    />
                  )}

                {layerDates.indexOf(matchingDateItemInLayer) !==
                  layerDates.length - 1 &&
                  layerDates[layerDates.indexOf(matchingDateItemInLayer) + 1]
                    .isEndDate && (
                    <div
                      className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase} ${classes.layerDirectionBackwardBase}`}
                    />
                  )}

                <div
                  className={`${
                    matchingDateItemInLayer.isEndDate ||
                    matchingDateItemInLayer.isStartDate
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
      borderBottom: '6px solid transparent',
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
