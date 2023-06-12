import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { memo, useCallback } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from '../../../../../config/types';
import { datesAreEqualWithoutTime } from '../../../../../utils/date-utils';

const TimelineItem = memo(
  ({
    classes,
    concatenatedLayers,
    currentDate,
    index,
    clickDate,
    dateItemStyling,
  }: TimelineItemProps) => {
    const handleClick = useCallback(
      (dateIndex: number) => {
        return () => {
          clickDate(dateIndex);
        };
      },
      [clickDate],
    );

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
                {layerIndex !== 0 && matchingDateItemInLayer.isStartDate && (
                  <div
                    className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase}`}
                  />
                )}
                {layerIndex !== 0 && matchingDateItemInLayer.isEndDate && (
                  <div
                    className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase} ${classes.layerDirectionBackwardBase}`}
                  />
                )}

                <div
                  className={dateItemStyling[layerIndex].class}
                  role="presentation"
                  onClick={handleClick(index)}
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
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      height: '0px',
      zIndex: 1,
    },

    layerDirectionBackwardBase: {
      transform: 'rotate(180deg)',
    },
  });

export interface TimelineItemProps extends WithStyles<typeof styles> {
  concatenatedLayers: DateItem[][];
  currentDate: DateRangeType;
  index: number;
  clickDate: (arg: number) => void;
  dateItemStyling: {
    class: string;
    color: string;
    layerDirectionClass?: string;
  }[];
}

export default withStyles(styles)(TimelineItem);
