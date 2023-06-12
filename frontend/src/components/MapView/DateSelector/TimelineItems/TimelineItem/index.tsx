import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { memo, useCallback } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from '../../../../../config/types';

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
            if (
              concatenatedLayers[layerIndex][index] === undefined ||
              (layerIndex !== 0 &&
                new Date(
                  concatenatedLayers[layerIndex][index].displayDate,
                ).toDateString() !== new Date(currentDate.value).toDateString())
            ) {
              return null;
            }
            return (
              <>
                {layerIndex !== 0 &&
                  concatenatedLayers[layerIndex][index].isStartDate && (
                    <div
                      key={`Forward-${currentDate.label}-${currentDate.value}-${layerDates[layerIndex]}`}
                      className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase}`}
                    />
                  )}
                <div>
                  {layerIndex !== 0 &&
                    concatenatedLayers[layerIndex][index].isEndDate && (
                      <div
                        key={`Backward-${currentDate.label}-${currentDate.value}-${layerDates[layerIndex]}`}
                        className={`${dateItemStyling[layerIndex].layerDirectionClass} ${classes.layerDirectionBase} ${classes.layerDirectionBackwardBase}`}
                      />
                    )}
                </div>

                <div
                  key={`Nested-${currentDate.label}-${currentDate.value}-${layerDates[layerIndex]}`}
                  className={dateItemStyling[layerIndex].class}
                  role="presentation"
                  onClick={handleClick(index)}
                />
              </>
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
