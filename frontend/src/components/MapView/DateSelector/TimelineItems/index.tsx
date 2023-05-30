import {
  Fade,
  Grid,
  Tooltip,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import { compact, merge } from 'lodash';
import React, { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  AdminLevelDataLayerProps,
  DateRangeType,
  DatesPropagation,
} from '../../../../config/types';
import { moment, useSafeTranslation } from '../../../../i18n';
import { MONTH_YEAR_DATE_FORMAT } from '../../../../utils/name-utils';
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
} from '../../../../utils/server-utils';
import { TIMELINE_ITEM_WIDTH, formatDate } from '../utils';
import TooltipItem from './TooltipItem';
import { availableDatesSelector } from '../../../../context/serverStateSlice';

const TimelineItems = memo(
  ({
    classes,
    intersectionDates,
    dateRange,
    clickDate,
    locale,
    selectedLayers,
  }: TimelineItemsProps) => {
    const serverAvailableDates = useSelector(availableDatesSelector);

    const handleClick = useCallback(
      (dateIndex: number) => {
        return () => {
          clickDate(dateIndex);
        };
      },
      [clickDate],
    );

    const { t } = useSafeTranslation();

    const selectedLayerDates = useMemo(
      () =>
        selectedLayers.map(layer => {
          return getPossibleDatesForLayer(layer, serverAvailableDates)
            .filter(value => value) // null check
            .flat();
        }),
      [selectedLayers, serverAvailableDates],
    );

    // Hard coded styling for date items (first, second, and third layers)
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

    const formattedSelectedLayerDates = selectedLayerDates.map(layerDates =>
      layerDates.map(layerDate => formatDate(layerDate)),
    );

    const formattedIntersectionDates = intersectionDates.map(layerDate =>
      formatDate(layerDate),
    );

    const getTooltipTitle = useCallback(
      (date: DateRangeType): JSX.Element[] => {
        const tooltipTitleArray: JSX.Element[] = compact(
          selectedLayers.map((selectedLayer, layerIndex) => {
            if (
              !formattedSelectedLayerDates[layerIndex].includes(
                formatDate(date.value),
              )
            ) {
              return undefined;
            }
            return (
              <TooltipItem
                key={selectedLayer.title}
                layerTitle={t(selectedLayer.title)}
                color={DATE_ITEM_STYLING[layerIndex + 1].color}
              />
            );
          }),
        );
        // eslint-disable-next-line fp/no-mutating-methods
        tooltipTitleArray.unshift(<div key={date.label}>{date.label}</div>);

        return tooltipTitleArray;
      },
      [DATE_ITEM_STYLING, formattedSelectedLayerDates, selectedLayers, t],
    );

    const renderDateItemLabel = useCallback(
      (date: DateRangeType) => {
        if (date.isFirstDay) {
          return (
            <Typography variant="body2" className={classes.dateItemLabel}>
              {moment(date.value).locale(locale).format(MONTH_YEAR_DATE_FORMAT)}
            </Typography>
          );
        }
        return <div className={classes.dayItem} />;
      },
      [classes.dateItemLabel, classes.dayItem, locale],
    );

    const hasValidityDates = (
      selectedLayersList: DateCompatibleLayer[],
      layerIndex: number,
      date: DateRangeType,
    ) => {
      return (
        selectedLayersList &&
        selectedLayersList[layerIndex] &&
        selectedLayersList[layerIndex].validity &&
        (selectedLayersList[layerIndex] as AdminLevelDataLayerProps).dates &&
        (selectedLayersList[
          layerIndex
        ] as AdminLevelDataLayerProps).dates!.includes(date.date)
      );
    };

    const renderLayerDates = useCallback(
      (date: DateRangeType, index: number) => {
        const isValidityBackwardOrBothDirection = (
          selectedLayersList: DateCompatibleLayer[],
          layerIndex: number,
        ) => {
          return (
            hasValidityDates(selectedLayers, layerIndex, date) &&
            (selectedLayersList[layerIndex].validity?.mode ===
              DatesPropagation.BACKWARD ||
              selectedLayersList[layerIndex].validity?.mode ===
                DatesPropagation.BOTH)
          );
        };

        const isValidityForwardOrBothDirection = (
          selectedLayersList: DateCompatibleLayer[],
          layerIndex: number,
        ) => {
          return (
            hasValidityDates(selectedLayers, layerIndex, date) &&
            (selectedLayersList[layerIndex].validity?.mode ===
              DatesPropagation.FORWARD ||
              selectedLayersList[layerIndex].validity?.mode ===
                DatesPropagation.BOTH)
          );
        };

        return [formattedIntersectionDates, ...formattedSelectedLayerDates].map(
          (layerDates, layerIndex) => {
            if (!layerDates.includes(formatDate(date.value))) {
              return null;
            }
            return (
              <div>
                {isValidityForwardOrBothDirection(
                  selectedLayers,
                  layerIndex,
                ) && (
                  <div
                    className={`${DIRECTION_ITEM_STYLING[layerIndex].class} ${classes.layerDirectionBase}`}
                  />
                )}

                {isValidityBackwardOrBothDirection(
                  selectedLayers,
                  layerIndex,
                ) && (
                  <div
                    className={`${DIRECTION_ITEM_STYLING[layerIndex].class} ${classes.layerDirectionBase} ${classes.layerDirectionBackwardBase}`}
                  />
                )}

                <div
                  key={`Nested-${date.label}-${date.value}-${layerDates[layerIndex]}`}
                  className={DATE_ITEM_STYLING[layerIndex].class}
                  role="presentation"
                  onClick={handleClick(index)}
                />
              </div>
            );
          },
        );
      },
      [
        DATE_ITEM_STYLING,
        DIRECTION_ITEM_STYLING,
        classes.layerDirectionBackwardBase,
        classes.layerDirectionBase,
        formattedIntersectionDates,
        formattedSelectedLayerDates,
        handleClick,
        selectedLayers,
      ],
    );

    return (
      <>
        {dateRange.map((date, index) => (
          <Tooltip
            title={<div>{getTooltipTitle(date)}</div>}
            key={`Root-${date.label}-${date.value}`}
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 0 }}
            placement="top"
            arrow
          >
            <Grid
              item
              xs
              className={
                date.isFirstDay ? classes.dateItemFull : classes.dateItem
              }
            >
              {renderDateItemLabel(date)}
              {renderLayerDates(date, index)}
            </Grid>
          </Tooltip>
        ))}
      </>
    );
  },
);

const DATE_ITEM_STYLES: CreateCSSProperties = {
  borderTop: '1px solid white',
  color: 'white',
  position: 'relative',
  top: -5,
  cursor: 'pointer',
  minWidth: TIMELINE_ITEM_WIDTH,
  '&:hover': {
    borderLeft: '1px solid #5ccfff',
  },
};

const BASE_DATE_ITEM: CreateCSSProperties = {
  position: 'absolute',
  height: 5,
  width: TIMELINE_ITEM_WIDTH,
  opacity: 0.6,
};

const styles = () =>
  createStyles({
    dateItemFull: {
      ...DATE_ITEM_STYLES,
      borderLeft: '1px solid white',
      height: 36,
    },

    dateItem: merge(DATE_ITEM_STYLES, {
      '&:hover': {
        '& $dayItem': {
          borderLeft: 0,
        },
      },
    }),

    dateItemLabel: {
      position: 'absolute',
      top: 22,
      textAlign: 'left',
      paddingLeft: 5,
      minWidth: 400,
    },

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
      right: '10px',
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  intersectionDates: number[];
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
  locale: string;
  selectedLayers: DateCompatibleLayer[];
}

export default withStyles(styles)(TimelineItems);
