import { CSSProperties, memo, useCallback, useMemo } from 'react';
import {
  Fade,
  Grid,
  Tooltip,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { AnticipatoryAction, DateItem, DateRangeType } from 'config/types';
import { grey } from 'muiTheme';
import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
} from 'components/MapView/DateSelector/utils';
import TimelineLabel from './TimelineLabel';
import {
  DARK_BLUE_HEX,
  DARK_GREEN_HEX,
  DARK_ORANGE_HEX,
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
  LIGHT_ORANGE_HEX,
} from './utils';
import AAdroughtTooltipContent from './AADroughtTooltipContent';
import AAStormTooltipContent from './AAStormTooltipContent';
import { DateItemStyle } from './types';
import AAStormTimelineItem from './AAStormTimelineItem';
import AADroughtTimelineItem from './AADroughtTimelineItem';

const TimelineItems = memo(
  ({
    dateRange,
    clickDate,
    locale,
    orderedLayers,
    truncatedLayers,
    availableDates,
  }: TimelineItemsProps) => {
    const classes = useStyles();

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: DateItemStyle[] = useMemo(
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

    const isShowingAAStormLayer = orderedLayers.find(
      layer => layer.id === AnticipatoryAction.storm,
    );

    const getTooltipContent = useCallback(
      (date: DateRangeType) =>
        isShowingAAStormLayer ? (
          <AAStormTooltipContent date={date} />
        ) : (
          <AAdroughtTooltipContent
            date={date}
            orderedLayers={orderedLayers}
            dateItemStyling={DATE_ITEM_STYLING}
          />
        ),
      [isShowingAAStormLayer, DATE_ITEM_STYLING, orderedLayers],
    );

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
              title={<>{getTooltipContent(date)}</>}
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 0 }}
              placement="top"
              arrow
              {...(isShowingAAStormLayer ? { interactive: true } : null)}
              classes={{
                tooltip: isShowingAAStormLayer
                  ? classes.AAStormTooltip
                  : classes.defaultTooltip,
                arrow: isShowingAAStormLayer
                  ? classes.AAStormTooltipArrow
                  : undefined,
              }}
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

                {isShowingAAStormLayer ? (
                  <AAStormTimelineItem currentDate={date} />
                ) : (
                  <AADroughtTimelineItem
                    concatenatedLayers={truncatedLayers}
                    currentDate={date}
                    dateItemStyling={DATE_ITEM_STYLING}
                    isDateAvailable={isDateAvailable}
                  />
                )}
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

const useStyles = makeStyles(() =>
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
    defaultTooltip: {
      backgroundColor: '#222222',
      opacity: '0.85 !important',
      maxWidth: 'none',
    },
    AAStormTooltip: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #D3D3D3',
      maxWidth: 'none',
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

    AAStormTooltipArrow: {
      width: '11px',
      height: '11px',
      bottom: '-1px !important',
      '&::before': {
        width: '8px',
        height: '8px',
        backgroundColor: 'white',
        transformOrigin: 'center !important',
        boxSizing: 'border-box',
        borderWidth: '0px 1px 1px 0px',
        borderColor: '#D3D3D3',
        borderStyle: 'solid',
      },
    },
  }),
);

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

export interface TimelineItemsProps {
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
  locale: string;
  availableDates: number[];
  orderedLayers: DateCompatibleLayerWithDateItems[];
  truncatedLayers: DateItem[][];
}

export default TimelineItems;
