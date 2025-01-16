import {
  Button,
  Grid,
  Theme,
  createStyles,
  makeStyles,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { ChevronLeft, ChevronRight } from '@material-ui/icons';
import { findIndex, get, isEqual } from 'lodash';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Draggable, { DraggableEvent } from 'react-draggable';
import { useDispatch, useSelector } from 'react-redux';
import {
  AnticipatoryAction,
  DateItem,
  DateRangeType,
  Panel,
} from 'config/types';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { locales, useSafeTranslation } from 'i18n';
import {
  dateStrToUpperCase,
  datesAreEqualWithoutTime,
  getFormattedDate,
} from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { useUrlHistory } from 'utils/url-utils';
import useLayers from 'utils/layers-utils';
import { format } from 'date-fns';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { updateDateRange } from 'context/mapStateSlice';
import { getRequestDate } from 'utils/server-utils';
import { isAnticipatoryActionLayer, isWindowedDates } from 'config/utils';
import { getAAConfig } from 'context/anticipatoryAction/config';
import { RootState } from 'context/store';
import TickSvg from './tick.svg';
import DateSelectorInput from './DateSelectorInput';
import TimelineItems from './TimelineItems';
import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
  findDateIndex,
} from './utils';
import { oneDayInMs } from '../LeftPanel/utils';

type Point = {
  x: number;
  y: number;
};

const TIMELINE_ID = 'dateTimelineSelector';
const POINTER_ID = 'datePointerSelector';

const calculateStartAndEndDates = (startDate: Date, selectedTab: string) => {
  const year =
    startDate.getFullYear() -
    (selectedTab === Panel.AnticipatoryActionDrought && startDate.getMonth() < 3
      ? 1
      : 0);

  const startMonth = Panel.AnticipatoryActionDrought === selectedTab ? 3 : 0; // April for anticipatory_action, January otherwise

  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 11, 31);

  return { start, end };
};

const DateSelector = memo(() => {
  const classes = useStyles();
  const {
    selectedLayerDates: availableDates,
    selectedLayersWithDateSupport: selectedLayers,
    checkSelectedDateForLayerSupport,
  } = useLayers();

  const { startDate: stateStartDate } = useSelector(dateRangeSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const [dateRange, setDateRange] = useState<DateRangeType[]>([
    {
      value: 0,
      label: '',
      month: '',
      isFirstDay: false,
      date: new Date().toISOString(),
    },
  ]);

  const [timelinePosition, setTimelinePosition] = useState<Point>({
    x: 0,
    y: 0,
  });
  const [pointerPosition, setPointerPosition] = useState<Point>({
    x: 0,
    y: 0,
  });
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Normalize today's date

  const dateRef = useRef(availableDates);
  const timeLine = useRef(null);

  const { t } = useSafeTranslation();
  const { updateHistory } = useUrlHistory();
  const dispatch = useDispatch();
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'));
  const xsDown = useMediaQuery(theme.breakpoints.down('xs'));

  useEffect(() => {
    const closestDate = checkSelectedDateForLayerSupport(stateStartDate);
    if (closestDate) {
      updateStartDate(new Date(closestDate), true);
    }
    // Only run this check when selectedLayers changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayers]);

  const maxDate = useMemo(
    () => new Date(Math.max(...availableDates, new Date().getTime())),
    [availableDates],
  );

  const AAConfig = useMemo(() => {
    const anticipatoryLayer = selectedLayers.find(layer =>
      isAnticipatoryActionLayer(layer.type),
    );
    if (anticipatoryLayer) {
      return getAAConfig(anticipatoryLayer.type as AnticipatoryAction);
    }
    return null;
  }, [selectedLayers]);

  const AAAvailableDates = useSelector((state: RootState) =>
    AAConfig ? AAConfig.availableDatesSelector(state) : null,
  );

  // Create a temporary layer for each AA window
  const AALayers: DateCompatibleLayerWithDateItems[] = useMemo(() => {
    if (!AAAvailableDates) {
      return [];
    }

    if (isWindowedDates(AAAvailableDates)) {
      return [
        {
          id: 'anticipatory_action_window_1',
          title: 'Window 1',
          dateItems: AAAvailableDates['Window 1'],
          type: AnticipatoryAction.drought,
          opacity: 1,
        },
        {
          id: 'anticipatory_action_window_2',
          title: 'Window 2',
          dateItems: AAAvailableDates['Window 2'],
          type: AnticipatoryAction.drought,
          opacity: 1,
        },
      ];
    }

    return [
      {
        id: 'anticipatory_action_storm',
        title: 'Anticipatory Action Storm',
        dateItems: AAAvailableDates,
        type: AnticipatoryAction.storm,
        opacity: 1,
      },
    ];
  }, [AAAvailableDates]);

  // Replace anticipatory action unique layer by window1 and window2 layers
  // Keep anticipatory actions at the top of the timeline
  const orderedLayers: DateCompatibleLayerWithDateItems[] = useMemo(
    () =>
      // eslint-disable-next-line fp/no-mutating-methods
      selectedLayers
        .sort((a, b) => {
          const aIsAnticipatory = a.id.includes('anticipatory_action_drought');
          const bIsAnticipatory = b.id.includes('anticipatory_action_drought');
          if (aIsAnticipatory && !bIsAnticipatory) {
            return -1;
          }
          if (!aIsAnticipatory && bIsAnticipatory) {
            return 1;
          }
          return 0;
        })
        .map(layer => {
          if (isAnticipatoryActionLayer(layer.type)) {
            return AALayers.filter(al => al.type === layer.type);
          }
          return layer;
        })
        .flat(),
    [selectedLayers, AALayers],
  );

  const timelineStartDate: string = useMemo(
    () => new Date(dateRange[0].value).toDateString(),
    [dateRange],
  );

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
        if (firstIndex === -1) {
          return layer.dateItems;
        }
        // truncate the date item array at index matching timeline first date with a buffer of 1 day decrements
        // eslint-disable-next-line fp/no-mutating-methods
        return layer.dateItems.slice(firstIndex - 1);
      }),
    ];
  }, [orderedLayers, timelineStartDate]);

  const visibleLayers = useMemo(
    () =>
      truncatedLayers.map((layer, index) => {
        const layerQueryDate = getRequestDate(
          layer,
          dateSelector.startDate,
          // Do not default to most recent for anticpatory action layers.
          // TODO - what about other layers?
          !orderedLayers[index].id.includes('anticipatory_action'),
        );
        // Filter date items based on queryDate and layerQueryDate
        return layer.filter(
          item =>
            (layerQueryDate &&
              datesAreEqualWithoutTime(item.queryDate, layerQueryDate)) ||
            datesAreEqualWithoutTime(item.queryDate, item.displayDate),
        );
      }),
    [orderedLayers, truncatedLayers, dateSelector.startDate],
  );

  const timeLineWidth = get(timeLine.current, 'offsetWidth', 0);

  const setPointerXPosition = useCallback(() => {
    if (
      pointerPosition.x >=
      dateRange.length * TIMELINE_ITEM_WIDTH - timeLineWidth
    ) {
      return timeLineWidth - dateRange.length * TIMELINE_ITEM_WIDTH;
    }
    if (pointerPosition.x > timeLineWidth) {
      return -pointerPosition.x + timeLineWidth / 2;
    }
    return 0;
  }, [dateRange.length, pointerPosition.x, timeLineWidth]);

  const handleTimeLinePosition = useCallback(
    (x: number) => {
      if (
        -timelinePosition.x <= pointerPosition.x &&
        -timelinePosition.x + timeLineWidth >= pointerPosition.x
      ) {
        return;
      }
      setTimelinePosition({ x, y: 0 });
    },
    [pointerPosition.x, timeLineWidth, timelinePosition.x],
  );

  // Move the slider automatically so that the pointer always visible
  useEffect(() => {
    const x = setPointerXPosition();
    handleTimeLinePosition(x);
  }, [handleTimeLinePosition, setPointerXPosition]);

  const locale = useMemo(
    () => (t('date_locale') ? t('date_locale') : 'en'),
    [t],
  );

  const panelTab = useSelector(leftPanelTabValueSelector);

  const range = useMemo(() => {
    const startDate = stateStartDate ? new Date(stateStartDate) : new Date();
    const { start, end } = calculateStartAndEndDates(startDate, panelTab);
    const daysArray: Date[] = [];

    for (
      let currentDate = start;
      currentDate <= end;
      // eslint-disable-next-line fp/no-mutation
      currentDate = new Date(currentDate.getTime() + 1 * oneDayInMs)
    ) {
      // eslint-disable-next-line fp/no-mutating-methods
      daysArray.push(new Date(currentDate));
    }

    return daysArray.map(date => {
      date.setUTCHours(12, 0, 0, 0);
      return {
        value: date.getTime(),
        label: dateStrToUpperCase(
          format(date, DateFormat.MonthFirst, {
            locale: locales[locale as keyof typeof locales],
          }),
        ),
        month: dateStrToUpperCase(
          format(date, DateFormat.ShortMonthYear, {
            locale: locales[locale as keyof typeof locales],
          }),
        ),
        date: getFormattedDate(date, 'default') as string,
        isFirstDay: date.getDate() === 1,
      };
    });
  }, [locale, stateStartDate, panelTab]);

  const dateIndex = useMemo(
    () =>
      findIndex(
        range,
        date =>
          !!stateStartDate &&
          datesAreEqualWithoutTime(date.value, stateStartDate),
      ),
    [range, stateStartDate],
  );

  // Create timeline range and set pointer position
  useEffect(() => {
    setDateRange(range);
    setPointerPosition({
      x: dateIndex * TIMELINE_ITEM_WIDTH,
      y: 0,
    });
  }, [dateIndex, range]);

  // move pointer to closest date when change map layer
  useEffect(() => {
    if (isEqual(dateRef.current, availableDates)) {
      return;
    }
    setDatePosition(stateStartDate, 0, false);
    dateRef.current = availableDates;
  });

  const includedDates = useMemo(
    () => availableDates?.map(d => new Date(d)) ?? [],
    [availableDates],
  );

  // Find the dates that are queriable
  const selectableDates = useMemo(() => {
    if (truncatedLayers.length === 0) {
      return [];
    }
    // Get the dates that are queriable for any layers
    const dates = truncatedLayers.map(layerDates =>
      layerDates.map(dateItem => dateItem.displayDate),
    );

    // All dates in AA windows should be selectable, regardless of overlap
    if (isAnticipatoryActionLayer(panelTab) && AAAvailableDates) {
      if (isWindowedDates(AAAvailableDates)) {
        // eslint-disable-next-line fp/no-mutating-methods
        dates.push(
          AAAvailableDates?.['Window 1']?.map(d => d.displayDate) ?? [],
          AAAvailableDates?.['Window 2']?.map(d => d.displayDate) ?? [],
        );
      } else {
        // eslint-disable-next-line fp/no-mutating-methods
        dates.push(AAAvailableDates?.map(d => d.displayDate) ?? []);
      }

      // eslint-disable-next-line fp/no-mutating-methods
      return dates
        .reduce((acc, currentArray) => [
          ...acc,
          ...currentArray.filter(
            date =>
              !acc.some(accDate => datesAreEqualWithoutTime(date, accDate)),
          ),
        ])
        .sort((a, b) => a - b);
    }

    // Other layers should rely on the dates available in truncatedLayers
    return dates.reduce((acc, currentArray) =>
      acc.filter(date =>
        currentArray.some(currentDate =>
          datesAreEqualWithoutTime(date, currentDate),
        ),
      ),
    );
  }, [AAAvailableDates, panelTab, truncatedLayers]);

  const updateStartDate = useCallback(
    (date: Date, isUpdatingHistory: boolean) => {
      if (!isUpdatingHistory) {
        return;
      }
      const time = date.getTime();
      const selectedIndex = findDateIndex(availableDates, date.getTime());
      checkSelectedDateForLayerSupport(date.getTime());
      if (
        selectedIndex < 0 ||
        (stateStartDate &&
          datesAreEqualWithoutTime(
            availableDates[selectedIndex],
            stateStartDate,
          ))
      ) {
        return;
      }
      updateHistory('date', getFormattedDate(time, 'default') as string);
      dispatch(updateDateRange({ startDate: time }));
    },
    [
      availableDates,
      checkSelectedDateForLayerSupport,
      stateStartDate,
      updateHistory,
      dispatch,
    ],
  );

  const setDatePosition = useCallback(
    (
      date: number | undefined,
      increment: number,
      isUpdatingHistory: boolean,
    ) => {
      const selectedIndex = findDateIndex(availableDates, date);

      if (availableDates[selectedIndex + increment]) {
        updateStartDate(
          new Date(availableDates[selectedIndex + increment]),
          isUpdatingHistory,
        );
      }
    },
    [availableDates, updateStartDate],
  );

  const incrementDate = useCallback(() => {
    setDatePosition(stateStartDate, 1, true);
  }, [setDatePosition, stateStartDate]);

  const decrementDate = useCallback(() => {
    setDatePosition(stateStartDate, -1, true);
  }, [setDatePosition, stateStartDate]);

  const clickDate = useCallback(
    (index: number) => {
      const selectedIndex = findDateIndex(
        selectableDates,
        dateRange[index].value,
      );
      const inRangeDate = new Date(dateRange[index].value);

      updateStartDate(inRangeDate, true);

      if (
        selectedIndex < 0 ||
        (stateStartDate &&
          datesAreEqualWithoutTime(
            selectableDates[selectedIndex],
            stateStartDate,
          ))
      ) {
        return;
      }
      setPointerPosition({ x: index * TIMELINE_ITEM_WIDTH, y: 0 });
      const updatedDate = new Date(selectableDates[selectedIndex]);
      updateStartDate(updatedDate, true);
    },
    [
      selectableDates,
      dateRange,
      stateStartDate,
      setPointerPosition,
      updateStartDate,
    ],
  );

  // Set timeline position after being dragged
  const onTimelineStop = useCallback((_e: DraggableEvent, position: Point) => {
    setTimelinePosition(position);
  }, []);

  const onPointerStart = useCallback((e: DraggableEvent) => {
    e.stopPropagation();
  }, []);

  const onPointerDrag = useCallback(
    (_e: DraggableEvent, position: Point) => {
      const exactX = Math.round(position.x / TIMELINE_ITEM_WIDTH);
      if (exactX >= dateRange.length) {
        return;
      }
      const selectedIndex = findDateIndex(
        availableDates,
        dateRange[exactX].value,
      );
      if (selectedIndex < 0) {
        return;
      }
      setPointerPosition({
        x: exactX * TIMELINE_ITEM_WIDTH,
        y: position.y,
      });

      // Hide all tooltips
      const allTooltips = document.querySelectorAll('[data-date-index]');
      allTooltips.forEach(tooltip => {
        tooltip.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });

      // Show current tooltip
      const tooltipElement = document.querySelector(
        `[data-date-index="${exactX}"]`,
      );
      if (tooltipElement) {
        tooltipElement.dispatchEvent(
          new MouseEvent('mouseover', { bubbles: true }),
        );
      }
    },
    [availableDates, dateRange],
  );

  // Set pointer position after being dragged
  const onPointerStop = useCallback(
    (_e: DraggableEvent, position: Point) => {
      const exactX = Math.round(position.x / TIMELINE_ITEM_WIDTH);
      if (exactX >= dateRange.length) {
        return;
      }
      clickDate(exactX);
      // Hide the tooltip for exactX
      const tooltipElement = document.querySelector(
        `[data-date-index="${exactX}"]`,
      );
      if (tooltipElement) {
        tooltipElement.dispatchEvent(
          new MouseEvent('mouseout', { bubbles: true }),
        );
      }
    },
    [clickDate, dateRange],
  );

  const handleOnDatePickerChange = useCallback(
    (date: Date) => {
      updateStartDate(date, true);
    },
    [updateStartDate],
  );

  // Only display the date selector once dates are loaded
  if (dateRange.length <= 1) {
    return null;
  }

  return (
    <div
      className={classes.container}
      style={{ zIndex: tabValue === Panel.Charts ? -1 : 1300 }}
    >
      <Grid
        container
        alignItems="center"
        justifyContent="center"
        className={classes.datePickerContainer}
      >
        {/* Mobile */}
        <Grid item xs={12} sm={1} className={classes.datePickerGrid}>
          {!smUp && (
            <Button onClick={decrementDate}>
              <ChevronLeft style={{ color: '#101010' }} />
            </Button>
          )}

          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            className={classes.datePickerInput}
            selected={stateStartDate ? new Date(stateStartDate) : new Date()}
            onChange={handleOnDatePickerChange}
            maxDate={maxDate}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={<DateSelectorInput />}
            // Include "today" so that the user can select it and get an error message if
            // the selected date is not available
            includeDates={[...includedDates, today]}
          />

          {!smUp && (
            <Button onClick={incrementDate}>
              <ChevronRight style={{ color: '#101010' }} />
            </Button>
          )}
        </Grid>

        {/* Desktop */}
        <Grid item xs={12} sm className={classes.slider}>
          {!xsDown && (
            <Button onClick={decrementDate} className={classes.chevronDate}>
              <ChevronLeft />
            </Button>
          )}
          <Grid className={classes.dateContainer} ref={timeLine}>
            <Draggable
              axis="x"
              handle={`#${TIMELINE_ID}`}
              bounds={{
                top: 0,
                bottom: 0,
                right: 0,
                left: timeLineWidth - dateRange.length * TIMELINE_ITEM_WIDTH,
              }}
              position={timelinePosition}
              onStop={onTimelineStop}
            >
              <div className={classes.timeline} id={TIMELINE_ID}>
                <Grid
                  container
                  alignItems="stretch"
                  className={classes.dateLabelContainer}
                >
                  {stateStartDate && (
                    <TimelineItems
                      dateRange={dateRange}
                      clickDate={clickDate}
                      locale={locale}
                      orderedLayers={orderedLayers}
                      truncatedLayers={visibleLayers}
                      availableDates={availableDates}
                    />
                  )}
                </Grid>
                <Draggable
                  axis="x"
                  handle={`#${POINTER_ID}`}
                  bounds={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: dateRange.length * TIMELINE_ITEM_WIDTH,
                  }}
                  grid={[TIMELINE_ITEM_WIDTH, 1]}
                  position={pointerPosition}
                  onStart={onPointerStart}
                  onStop={onPointerStop}
                  onDrag={onPointerDrag}
                >
                  <div className={classes.pointer} id={POINTER_ID}>
                    <img
                      src={TickSvg}
                      alt="Tick Svg"
                      style={{ pointerEvents: 'none', marginTop: -29 }}
                    />
                  </div>
                </Draggable>
              </div>
            </Draggable>
          </Grid>
          {!xsDown && (
            <Button onClick={incrementDate} className={classes.chevronDate}>
              <ChevronRight />
            </Button>
          )}
        </Grid>
      </Grid>
    </div>
  );
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      position: 'absolute',
      bottom: '1.5rem',
      width: '100%',
    },

    chevronDate: {
      padding: 0,
      minWidth: '24px',
      marginBottom: 'auto',
      marginTop: 'auto',
      marginRight: '10px',
      marginLeft: '10px',
      color: '#101010',
      '&:hover': {
        backgroundColor: 'rgba(211,211,211, 0.3)',
      },
    },

    datePickerContainer: {
      border: '1px solid #D4D4D4',
      boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
      backgroundColor: 'white',
      color: '#101010',
      borderRadius: '8px',
      width: '90%',
      margin: 'auto',
      textAlign: 'center',
    },

    datePickerInput: {
      backgroundColor: 'white',
      color: '#101010',
      paddingBottom: theme.spacing(2),
      paddingTop: theme.spacing(2),
    },

    datePickerGrid: {
      display: 'flex',
      minWidth: 150,
      justifyContent: 'center',
      [theme.breakpoints.down('xs')]: {
        marginBottom: theme.spacing(1),
      },
    },

    slider: {
      display: 'flex',
    },

    dateContainer: {
      position: 'relative',
      height: 54,
      flexGrow: 1,
      cursor: 'e-resize',
      overflow: 'hidden',
    },

    dateLabelContainer: {
      position: 'absolute',
      flexWrap: 'nowrap',
    },

    timeline: {
      position: 'absolute',
      top: 8,
    },

    pointer: {
      position: 'absolute',
      zIndex: 5,
      marginTop: 22,
      left: -12,
      height: '16px',
      cursor: 'grab',
    },
  }),
);

export default DateSelector;
