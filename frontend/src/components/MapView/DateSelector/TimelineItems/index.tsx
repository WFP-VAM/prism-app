import React, { CSSProperties, memo, useCallback, useMemo } from 'react';
import {
  Fade,
  Grid,
  Tooltip,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { compact } from 'lodash';
import { DateItem, DateRangeType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { grey } from 'muiTheme';

import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
} from 'components/MapView/DateSelector/utils';
import { datesAreEqualWithoutTime, getFormattedDate } from 'utils/date-utils';
import { useSelector } from 'react-redux';
import { AAAvailableDatesSelector } from 'context/anticipatoryActionStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { getRequestDate } from 'utils/server-utils';
import TimelineItem from './TimelineItem';
import TimelineLabel from './TimelineLabel';
import TooltipItem from './TooltipItem';
import {
  DARK_BLUE_HEX,
  DARK_GREEN_HEX,
  DARK_ORANGE_HEX,
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
  LIGHT_ORANGE_HEX,
} from './utils';

type DateItemStyle = {
  class: string;
  color: string;
  layerDirectionClass?: string;
  emphasis?: string;
};

const TimelineItems = memo(
  ({
    classes,
    dateRange,
    clickDate,
    locale,
    selectedLayers,
    availableDates,
  }: TimelineItemsProps) => {
    const { t } = useSafeTranslation();
    const AAAvailableDates = useSelector(AAAvailableDatesSelector);

    // Create a temporary layer for each AA window
    const AALayers = AAAvailableDates
      ? [
          {
            id: 'anticipatory_action_window_1',
            title: 'Window 1',
            dateItems: AAAvailableDates['Window 1'],
          },
          {
            id: 'anticipatory_action_window_2',
            title: 'Window 2',
            dateItems: AAAvailableDates['Window 2'],
          },
        ]
      : [];

    // Replace anticipatory action unique layer by window1 and window2 layers
    // Keep anticipatory actions at the top of the timeline
    // eslint-disable-next-line fp/no-mutating-methods
    const orderedLayers = selectedLayers
      .sort((a, b) => {
        const aIsAnticipatory = a.id.includes('anticipatory_action');
        const bIsAnticipatory = b.id.includes('anticipatory_action');
        if (aIsAnticipatory && !bIsAnticipatory) {
          return -1;
        }
        if (!aIsAnticipatory && bIsAnticipatory) {
          return 1;
        }
        return 0;
      })
      .map(l => {
        if (l.type === 'anticipatory_action') {
          return AALayers;
        }
        return l;
      })
      .flat();

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: DateItemStyle[] = React.useMemo(
      () => [
        {
          class: classes.layerOneDate,
          color: LIGHT_BLUE_HEX,
          layerDirectionClass: classes.layerOneDirection,
          emphasis: classes.layerOneEmphasis,
        },
        {
          class: classes.layerTwoDate,
          color: LIGHT_GREEN_HEX,
          layerDirectionClass: classes.layerTwoDirection,
          emphasis: classes.layerTwoEmphasis,
        },
        {
          class: classes.layerThreeDate,
          color: LIGHT_ORANGE_HEX,
          layerDirectionClass: classes.layerThreeDirection,
          emphasis: classes.layerThreeEmphasis,
        },
        { class: classes.availabilityDate, color: LIGHT_ORANGE_HEX },
      ],
      [classes],
    );

    const getTooltipTitle = useCallback(
      (date: DateRangeType): React.JSX.Element[] => {
        const tooltipTitleArray: React.JSX.Element[] = compact(
          orderedLayers.map((selectedLayer, layerIndex) => {
            // find closest date element for layer
            const dateItem = selectedLayer.dateItems.find(item =>
              datesAreEqualWithoutTime(item.displayDate, date.value),
            );
            if (!dateItem) {
              return null;
            }

            // Display range dates when available
            const formattedDate =
              dateItem.startDate && dateItem.endDate
                ? `${getFormattedDate(
                    dateItem.startDate,
                    'monthDay',
                  )} - ${getFormattedDate(dateItem.endDate, 'monthDay')}`
                : getFormattedDate(dateItem.queryDate, 'monthDay');
            return (
              <TooltipItem
                key={`Tootlip-${date.label}-${date.value}-${selectedLayer.title}`}
                layerTitle={`${t(selectedLayer.title)}:  ${formattedDate}`}
                color={DATE_ITEM_STYLING[layerIndex].color}
              />
            );
          }),
        );
        // eslint-disable-next-line fp/no-mutating-methods
        tooltipTitleArray.unshift(<div key={date.label}>{date.label}</div>);
        return tooltipTitleArray;
      },
      [DATE_ITEM_STYLING, orderedLayers, t],
    );

    const timelineStartDate: string = new Date(
      dateRange[0].value,
    ).toDateString();

    const dateSelector = useSelector(dateRangeSelector);
    // We truncate layer by removing date that will not be drawn to the Timeline
    const truncatedLayers: DateItem[][] = useMemo(() => {
      // returns the index of the first date in layer that matches the first Timeline date
      const findLayerFirstDateIndex = (items: DateItem[]): number =>
        items
          .map(d => new Date(d.displayDate).toDateString())
          .indexOf(timelineStartDate);

      return [
        ...orderedLayers.map(layer => {
          const firstIndex = findLayerFirstDateIndex(layer.dateItems);
          const layerQueryDate = getRequestDate(
            layer.dateItems,
            dateSelector.startDate,
          );
          // Filter date items based on queryDate and layerQueryDate
          const filterDateItems = (items: DateItem[]) =>
            items.filter(
              item =>
                item.queryDate === layerQueryDate ||
                item.queryDate === item.displayDate,
            );
          if (firstIndex === -1) {
            return filterDateItems(layer.dateItems);
          }
          // truncate the date item array at index matching timeline first date
          // eslint-disable-next-line fp/no-mutating-methods
          return filterDateItems(layer.dateItems.slice(firstIndex));
        }),
      ];
    }, [orderedLayers, timelineStartDate, dateSelector.startDate]);

    const availableDatesToDisplay = availableDates.filter(
      date => date >= dateRange[0].value,
    );

    // Draw a column for each date of the Timeline that start at the beginning of the year
    return (
      <>
        {dateRange.map((date, index) => {
          const isDateAvailable = availableDatesToDisplay.includes(date.value);
          return (
            <Tooltip
              key={`Root-${date.label}-${date.value}`}
              title={<>{getTooltipTitle(date)}</>}
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 0 }}
              placement="top"
              arrow
              classes={{ tooltip: classes.tooltip }}
            >
              <Grid
                item
                xs
                className={`${
                  date.isFirstDay ? classes.dateItemFull : classes.dateItem
                }`}
                onClick={() => clickDate(index)}
                data-date-index={index} // Used by the pointer tick to trigger tooltips
              >
                <TimelineLabel locale={locale} date={date} />
                <TimelineItem
                  concatenatedLayers={truncatedLayers}
                  currentDate={date}
                  dateItemStyling={DATE_ITEM_STYLING}
                  isDateAvailable={isDateAvailable}
                />
              </Grid>
            </Tooltip>
          );
        })}
      </>
    );
  },
);

const createLayerStyles = (
  backgroundColor: CSSProperties['backgroundColor'],
  top: CSSProperties['top'],
): LayerStyle => ({
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
  opacity: 0.6,
  top,
  backgroundColor,
});

const createDirectionStyles = (
  borderColor: CSSProperties['borderColor'],
  top: CSSProperties['top'],
): DirectionStyle => ({
  top,
  borderLeft: `6px solid ${borderColor}`,
});

const styles = () =>
  createStyles({
    dateItemFull: {
      color: '#101010',
      position: 'relative',
      top: -5,
      cursor: 'pointer',
      minWidth: TIMELINE_ITEM_WIDTH,
      '&:hover': {
        borderLeft: '1px solid #101010',
      },
      borderLeft: '1px solid #101010',
      height: 36,
    },
    dateItem: {
      color: '#101010',
      position: 'relative',
      top: -5,
      cursor: 'pointer',
      minWidth: TIMELINE_ITEM_WIDTH,
      '&:hover': {
        borderLeft: '1px solid #101010',
        '& $dayItem': {
          borderLeft: 0,
        },
      },
    },

    tooltip: {
      backgroundColor: '#222222',
      opacity: '0.85 !important',
    },

    layerOneDate: createLayerStyles(LIGHT_BLUE_HEX, 0),
    layerTwoDate: createLayerStyles(LIGHT_GREEN_HEX, 10),
    layerThreeDate: createLayerStyles(LIGHT_ORANGE_HEX, 20),
    availabilityDate: createLayerStyles(grey, 0),

    layerOneEmphasis: createLayerStyles(DARK_BLUE_HEX, 0),
    layerTwoEmphasis: createLayerStyles(DARK_GREEN_HEX, 10),
    layerThreeEmphasis: createLayerStyles(DARK_ORANGE_HEX, 20),

    layerOneDirection: createDirectionStyles(DARK_BLUE_HEX, 0),
    layerTwoDirection: createDirectionStyles(DARK_GREEN_HEX, 10),
    layerThreeDirection: createDirectionStyles(DARK_ORANGE_HEX, 20),

    currentDate: {
      border: '2px solid black',
      top: '-7px',
      minWidth: '13.9px',
      maxHeight: '34.05px',
      '&:hover': {
        border: '2px solid black',
      },
    },
  });

type LayerStyle = {
  position: CSSProperties['position'];
  height: CSSProperties['height'];
  width: CSSProperties['width'];
  pointerEvents: CSSProperties['pointerEvents'];
  opacity: CSSProperties['opacity'];
  top: CSSProperties['top'];
  backgroundColor: CSSProperties['backgroundColor'];
};

type DirectionStyle = {
  top: CSSProperties['top'];
  borderLeft: CSSProperties['borderLeft'];
};

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
  locale: string;
  selectedLayers: DateCompatibleLayerWithDateItems[];
  availableDates: number[];
}

export default withStyles(styles)(TimelineItems);
