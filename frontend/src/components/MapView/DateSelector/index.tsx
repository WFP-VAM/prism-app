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
import { DateItem, DateRangeType } from 'config/types';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { addNotification } from 'context/notificationStateSlice';
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
import { Panel, leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { updateDateRange } from 'context/mapStateSlice';
import { getRequestDate } from 'utils/server-utils';
import { AAAvailableDatesSelector } from 'context/anticipatoryActionStateSlice';
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
    (selectedTab === 'anticipatory_action' && startDate.getMonth() < 3 ? 1 : 0);
  const startMonth = selectedTab === 'anticipatory_action' ? 3 : 0; // April for anticipatory_action, January otherwise
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 11, 31);

  return { start, end };
};

const DateSelector = memo(() => {
  const classes = useStyles();
  const {
    selectedLayerDates: availableDates,
    selectedLayersWithDateSupport: selectedLayers,
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

  const maxDate = useMemo(
    () => new Date(Math.max(...availableDates, new Date().getTime())),
    [availableDates],
  );

  const AAAvailableDates = useSelector(AAAvailableDatesSelector);

  // Create a temporary layer for each AA window
  const AALayers: DateCompatibleLayerWithDateItems[] = useMemo(
    () =>
      AAAvailableDates
        ? [
            {
              id: 'anticipatory_action_window_1',
              title: 'Window 1',
              dateItems: AAAvailableDates['Window 1'],
              type: 'anticipatory_action',
              opacity: 1,
            },
            {
              id: 'anticipatory_action_window_2',
              title: 'Window 2',
              dateItems: AAAvailableDates['Window 2'],
              type: 'anticipatory_action',
              opacity: 1,
            },
          ]
        : [],
    [AAAvailableDates],
  );

  // Replace anticipatory action unique layer by window1 and window2 layers
  // Keep anticipatory actions at the top of the timeline
  const orderedLayers: DateCompatibleLayerWithDateItems[] = useMemo(
    () =>
      // eslint-disable-next-line fp/no-mutating-methods
      selectedLayers
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
        // truncate the date item array at index matching timeline first date
        // eslint-disable-next-line fp/no-mutating-methods
        return layer.dateItems.slice(firstIndex);
      }),
    ];
  }, [orderedLayers, timelineStartDate]);

  const visibleLayers = useMemo(
    () =>
      truncatedLayers.map(layer => {
        const layerQueryDate = getRequestDate(layer, dateSelector.startDate);
        // Filter date items based on queryDate and layerQueryDate
        return layer.filter(
          item =>
            (layerQueryDate &&
              datesAreEqualWithoutTime(item.queryDate, layerQueryDate)) ||
            datesAreEqualWithoutTime(item.queryDate, item.displayDate),
        );
      }),
    [truncatedLayers, dateSelector.startDate],
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
  const queriableDates = useMemo(() => {
    if (truncatedLayers.length === 0) {
      return [];
    }
    return (
      truncatedLayers
        // Get the dates that are queriable for any layers
        .map(layerDates =>
          layerDates
            // .filter(dateItem =>
            //   datesAreEqualWithoutTime(
            //     dateItem.queryDate,
            //     dateItem.displayDate,
            //   ),
            // )
            .map(dateItem => dateItem.displayDate),
        )
        // Get the dates that are queriable for all layers
        .reduce((acc, currentArray) =>
          acc.filter(date =>
            currentArray.some(currentDate =>
              datesAreEqualWithoutTime(date, currentDate),
            ),
          ),
        )
    );
  }, [truncatedLayers]);

  const checkIntersectingDateAndShowPopup = useCallback(
    (selectedDate: Date, positionY: number) => {
      const findDateInIntersectingDates = queriableDates.find(date =>
        datesAreEqualWithoutTime(date, selectedDate),
      );
      if (findDateInIntersectingDates) {
        return;
      }
      // if the date is not an intersecting one default to last intersecting date
      setPointerPosition({
        x: dateIndex * TIMELINE_ITEM_WIDTH,
        y: positionY,
      });
      dispatch(
        addNotification({
          message: t(
            'The date you selected is not valid for all selected layers. To change the date, either select a date where all selected layers have data (see timeline ticks), or deselect a layer',
          ),
          type: 'warning',
        }),
      );
    },
    [dateIndex, dispatch, queriableDates, t],
  );

  const updateStartDate = useCallback(
    (date: Date, isUpdatingHistory: boolean) => {
      if (!isUpdatingHistory) {
        return;
      }
      checkIntersectingDateAndShowPopup(date, 0);
      const time = date.getTime();
      const selectedIndex = findDateIndex(queriableDates, date.getTime());

      if (
        selectedIndex < 0 ||
        (stateStartDate &&
          datesAreEqualWithoutTime(
            queriableDates[selectedIndex],
            stateStartDate,
          ))
      ) {
        return;
      }
      // This updates state because a useEffect in MapView updates the redux state
      // TODO this is convoluted coupling, we should update state here if feasible.
      updateHistory('date', getFormattedDate(time, 'default') as string);
      dispatch(updateDateRange({ startDate: time }));
    },
    [
      checkIntersectingDateAndShowPopup,
      queriableDates,
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
        checkIntersectingDateAndShowPopup(
          new Date(availableDates[selectedIndex + increment]),
          0,
        );
      }
    },
    [availableDates, updateStartDate, checkIntersectingDateAndShowPopup],
  );

  const incrementDate = useCallback(() => {
    setDatePosition(stateStartDate, 1, true);
  }, [setDatePosition, stateStartDate]);

  const decrementDate = useCallback(() => {
    setDatePosition(stateStartDate, -1, true);
  }, [setDatePosition, stateStartDate]);

  // Click on available date to move the pointer
  const clickDate = (index: number) => {
    const selectedIndex = findDateIndex(queriableDates, dateRange[index].value);
    checkIntersectingDateAndShowPopup(
      new Date(queriableDates[selectedIndex]),
      0,
    );
    if (
      selectedIndex < 0 ||
      (stateStartDate &&
        datesAreEqualWithoutTime(queriableDates[selectedIndex], stateStartDate))
    ) {
      return;
    }
    setPointerPosition({ x: index * TIMELINE_ITEM_WIDTH, y: 0 });
    const updatedDate = new Date(queriableDates[selectedIndex]);
    updateStartDate(updatedDate, true);
  };

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
      const selectedIndex = findDateIndex(
        availableDates,
        dateRange[exactX].value,
      );
      if (
        selectedIndex < 0 ||
        availableDates[selectedIndex] === stateStartDate
      ) {
        return;
      }
      setPointerPosition({
        x: exactX * TIMELINE_ITEM_WIDTH,
        y: position.y,
      });
      const updatedDate = new Date(availableDates[selectedIndex]);
      checkIntersectingDateAndShowPopup(
        new Date(dateRange[exactX].value),
        position.y,
      );
      updateStartDate(updatedDate, true);

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
    [
      availableDates,
      checkIntersectingDateAndShowPopup,
      dateRange,
      stateStartDate,
      updateStartDate,
    ],
  );

  const handleOnDatePickerChange = useCallback(
    (date: Date) => {
      updateStartDate(date, true);
    },
    [updateStartDate],
  );

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
