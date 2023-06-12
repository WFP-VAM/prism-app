import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import React, { memo, useCallback } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from '../../../../../config/types';
import { TIMELINE_ITEM_WIDTH } from '../../utils';

const TimelineItem = memo(
  ({
    classes,
    concatenatedLayers,
    currentDate,
    index,
    clickDate,
  }: TimelineItemProps) => {
    const DATE_ITEM_STYLING: {
      class: string;
      color: string;
    }[] = [
      { class: classes.intersectionDate, color: 'White' },
      { class: classes.layerOneDate, color: 'Blue' },
      { class: classes.layerTwoDate, color: 'Yellow' },
      { class: classes.layerThreeDate, color: 'Red' },
      // For now, super-impose additional layers in case we have too many.
      // TODO - handle this more cleanly.
      { class: classes.layerThreeDate, color: 'Blue' },
      { class: classes.layerThreeDate, color: 'Yellow' },
    ];

    const DIRECTION_ITEM_STYLING: {
      class: string;
    }[] = [
      {
        class: classes.layerOneDirection,
      },
      {
        class: classes.layerTwoDirection,
      },
      {
        class: classes.layerThreeDirection,
      },
    ];

    const handleClick = useCallback(
      (dateIndex: number) => {
        return () => {
          clickDate(dateIndex);
        };
      },
      [clickDate],
    );

    return concatenatedLayers.map(
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
                  className={`${DIRECTION_ITEM_STYLING[layerIndex - 1].class} ${
                    classes.layerDirectionBase
                  }`}
                />
              )}
            <div>
              {layerIndex !== 0 &&
                concatenatedLayers[layerIndex][index].isEndDate && (
                  <div
                    key={`Backward-${currentDate.label}-${currentDate.value}-${layerDates[layerIndex]}`}
                    className={`${
                      DIRECTION_ITEM_STYLING[layerIndex - 1].class
                    } ${classes.layerDirectionBase} ${
                      classes.layerDirectionBackwardBase
                    }`}
                  />
                )}
            </div>

            <div
              key={`Nested-${currentDate.label}-${currentDate.value}-${layerDates[layerIndex]}`}
              className={DATE_ITEM_STYLING[layerIndex].class}
              role="presentation"
              onClick={handleClick(index)}
            />
          </>
        );
      },
    );
  },
);

const BASE_DATE_ITEM: CreateCSSProperties = {
  position: 'absolute',
  height: 5,
  width: TIMELINE_ITEM_WIDTH,
  opacity: 0.6,
};

const styles = () =>
  createStyles({
    dayItem: {
      height: 10,
      borderLeft: '1px solid white',
    },

    intersectionDate: {
      ...BASE_DATE_ITEM,
      top: 0,
      backgroundColor: 'white',
    },
    layerOneDate: {
      ...BASE_DATE_ITEM,
      top: 5,
      backgroundColor: 'blue',
    },
    layerTwoDate: {
      ...BASE_DATE_ITEM,
      top: 10,
      backgroundColor: 'yellow',
    },
    layerThreeDate: {
      ...BASE_DATE_ITEM,
      top: 15,
      backgroundColor: 'red',
    },

    layerDirectionBase: {
      display: 'block',
      position: 'absolute',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      height: '0px',
      zIndex: 1,
    },

    layerOneDirection: {
      top: 5,
      borderLeft: '8px solid darkblue',
    },
    layerTwoDirection: {
      top: 10,
      borderLeft: '8px solid yellow',
    },
    layerThreeDirection: {
      top: 15,
      borderLeft: '8px solid darkred',
    },

    layerDirectionBackwardBase: {
      transform: 'rotate(180deg)',
    },
  });

export interface TimelineItemProps extends WithStyles<typeof styles> {
  concatenatedLayers: any;
  currentDate: DateRangeType;
  index: number;
  clickDate: (arg: number) => void;
}

export default withStyles(styles)(TimelineItem);
