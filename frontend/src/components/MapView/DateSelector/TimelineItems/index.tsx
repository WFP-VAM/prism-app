import React, { memo, useCallback, useMemo } from 'react';
import {
  createStyles,
  Fade,
  Grid,
  Tooltip,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import { merge, compact } from 'lodash';
import {
  AdminLevelDataLayerProps,
  DateRangeType,
} from '../../../../config/types';
import { TIMELINE_ITEM_WIDTH, formatDate } from '../utils';
import { moment, useSafeTranslation } from '../../../../i18n';
import { MONTH_YEAR_DATE_FORMAT } from '../../../../utils/name-utils';
import TooltipItem from './TooltipItem';
import { DateCompatibleLayer } from '../../../../utils/server-utils';

const TimelineItems = memo(
  ({
    classes,
    intersectionDates,
    dateRange,
    selectedLayerDates,
    selectedLayerTitles,
    clickDate,
    locale,
    selectedLayers,
  }: TimelineItemsProps) => {
    const handleClick = useCallback(
      (dateIndex: number) => {
        return () => {
          clickDate(dateIndex);
        };
      },
      [clickDate],
    );

    const { t } = useSafeTranslation();

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: {
      class: string;
      color: string;
    }[] = useMemo(() => {
      return [
        { class: classes.intersectionDate, color: 'White' },
        { class: classes.layerOneDate, color: 'Blue' },
        { class: classes.layerTwoDate, color: 'Yellow' },
        { class: classes.layerThreeDate, color: 'Red' },
        // For now, super-impose additional layers in case we have too many.
        // TODO - handle this more cleanly.
        { class: classes.layerThreeDate, color: 'Blue' },
        { class: classes.layerThreeDate, color: 'Yellow' },
      ];
    }, [
      classes.intersectionDate,
      classes.layerOneDate,
      classes.layerThreeDate,
      classes.layerTwoDate,
    ]);

    const DIRECTION_ITEM_STYLING: {
      class: string;
      src: string;
    }[] = useMemo(() => {
      return [
        {
          class: classes.layerOneDirection,
          src: 'images/icon_blue_triangle.svg',
        },
        {
          class: classes.layerTwoDirection,
          src: 'images/icon_yellow_triangle.svg',
        },
        {
          class: classes.layerThreeDirection,
          src: 'images/icon_red_triangle.svg',
        },
      ];
    }, [
      classes.layerOneDirection,
      classes.layerTwoDirection,
      classes.layerThreeDirection,
    ]);

    const formattedSelectedLayerDates = useMemo(
      () =>
        selectedLayerDates.map(layerDates =>
          layerDates.map(layerDate => formatDate(layerDate)),
        ),
      [selectedLayerDates],
    );

    const formattedIntersectionDates = useMemo(
      () => intersectionDates.map(layerDate => formatDate(layerDate)),
      [intersectionDates],
    );

    const getTooltipTitle = useCallback(
      (date: DateRangeType): JSX.Element[] => {
        const tooltipTitleArray: JSX.Element[] = compact(
          selectedLayerTitles.map((selectedLayerTitle, layerIndex) => {
            if (
              !formattedSelectedLayerDates[layerIndex].includes(
                formatDate(date.value),
              )
            ) {
              return undefined;
            }
            return (
              <TooltipItem
                key={selectedLayerTitle}
                layerTitle={t(selectedLayerTitle)}
                color={DATE_ITEM_STYLING[layerIndex + 1].color}
              />
            );
          }),
        );
        // eslint-disable-next-line fp/no-mutating-methods
        tooltipTitleArray.unshift(<div key={date.label}>{date.label}</div>);

        return tooltipTitleArray;
      },
      [DATE_ITEM_STYLING, formattedSelectedLayerDates, selectedLayerTitles, t],
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

    const renderLayerDates = useCallback(
      (date: DateRangeType, index: number) => {
        return [formattedIntersectionDates, ...formattedSelectedLayerDates].map(
          (layerDates, layerIndex) => {
            if (!layerDates.includes(formatDate(date.value))) {
              return null;
            }
            return (
              <div>
                {selectedLayers &&
                  selectedLayers[layerIndex] &&
                  selectedLayers[layerIndex].validity &&
                  (selectedLayers[layerIndex] as AdminLevelDataLayerProps)
                    .dates &&
                  (selectedLayers[
                    layerIndex
                  ] as AdminLevelDataLayerProps).dates!.includes(date.date) && (
                    <img
                      src={DIRECTION_ITEM_STYLING[layerIndex].src}
                      alt="Validity direction"
                      className={DIRECTION_ITEM_STYLING[layerIndex].class}
                      style={{
                        height: '15px',
                        display: 'block',
                        position: 'absolute',
                      }}
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

    layerOneDirection: {
      top: 5,
      height: '15px',
      display: 'block',
      position: 'absolute',
    },
    layerTwoDirection: {
      top: 10,
      display: 'block',
      position: 'absolute',
    },
    layerThreeDirection: {
      top: 15,
      display: 'block',
      position: 'absolute',
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  intersectionDates: number[];
  selectedLayerDates: number[][];
  dateRange: DateRangeType[];
  selectedLayerTitles: string[];
  clickDate: (arg: number) => void;
  locale: string;
  selectedLayers: DateCompatibleLayer[];
}

export default withStyles(styles)(TimelineItems);
