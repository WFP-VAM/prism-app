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
import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
} from 'components/MapView/DateSelector/utils';
import TimelineItem from './TimelineItem';
import TimelineLabel from './TimelineLabel';
import TooltipItem from './TooltipItem';

type DateItemStyle = {
  class: string;
  color: string;
  layerDirectionClass?: string;
  emphasis?: string;
};

export const LIGHT_BLUE_HEX = '#C0E8FF';
const DARK_BLUE_HEX = '#00A3FF';

export const LIGHT_GREEN_HEX = '#B5F8BB';
const DARK_GREEN_HEX = '#68CC71';

const LIGHT_ORANGE_HEX = '#F9CEC1';
const DARK_ORANGE_HEX = '#FF9473';

const TimelineItems = memo(
  ({
    classes,
    dateRange,
    clickDate,
    locale,
    selectedLayers,
  }: TimelineItemsProps) => {
    const { t } = useSafeTranslation();

    // Keep anticipatory actions at the top of the timeline
    // eslint-disable-next-line fp/no-mutating-methods
    const orderedLayers = selectedLayers.sort((a, b) => {
      const aIsAnticipatory = a.id.includes('anticipatory_action');
      const bIsAnticipatory = b.id.includes('anticipatory_action');
      if (aIsAnticipatory && !bIsAnticipatory) {
        return -1;
      }
      if (!aIsAnticipatory && bIsAnticipatory) {
        return 1;
      }
      return 0;
    });

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: DateItemStyle[] = [
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
    ];

    const getTooltipTitle = useCallback(
      (date: DateRangeType): React.JSX.Element[] => {
        const tooltipTitleArray: React.JSX.Element[] = compact(
          orderedLayers.map((selectedLayer, layerIndex) => {
            return (
              <TooltipItem
                key={`Tootlip-${date.label}-${date.value}-${selectedLayer.title}`}
                layerTitle={t(selectedLayer.title)}
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

    // We truncate layer by removing date that will not be drawn to the Timeline
    const truncatedLayers: DateItem[][] = useMemo(() => {
      // returns the index of the fist date in layer that match the first Timeline date
      const findLayerFirstDateIndex = (items: DateItem[]): number => {
        return items
          .map(d => new Date(d.displayDate).toDateString())
          .indexOf(timelineStartDate);
      };

      // For each selectedLayer truncate DateItem array
      return [...orderedLayers.map(layer => layer.dateItems)].map(
        (dateItemsForLayer: DateItem[]) => {
          const firstIndex = findLayerFirstDateIndex(dateItemsForLayer);
          if (firstIndex === -1) {
            return dateItemsForLayer;
          }

          // truncate the date item array at index matching timeline first date
          // eslint-disable-next-line fp/no-mutating-methods
          return dateItemsForLayer.slice(firstIndex, dateItemsForLayer.length);
        },
      );
    }, [orderedLayers, timelineStartDate]);

    // Draw a column for each date of the Timeline that start at the beginning of the year
    return (
      <>
        {dateRange.map((date, index) => {
          return (
            <Tooltip
              key={`Root-${date.label}-${date.value}`}
              title={<>{getTooltipTitle(date)}</>}
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 0 }}
              placement="top"
              arrow
            >
              <Grid
                item
                xs
                className={`${
                  date.isFirstDay ? classes.dateItemFull : classes.dateItem
                }`}
                onClick={() => clickDate(index)}
              >
                <TimelineLabel locale={locale} date={date} />
                <TimelineItem
                  concatenatedLayers={truncatedLayers}
                  currentDate={date}
                  dateItemStyling={DATE_ITEM_STYLING}
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
    layerOneDate: createLayerStyles(LIGHT_BLUE_HEX, 0),
    layerTwoDate: createLayerStyles(LIGHT_GREEN_HEX, 10),
    layerThreeDate: createLayerStyles(LIGHT_ORANGE_HEX, 20),

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
}

export default withStyles(styles)(TimelineItems);
