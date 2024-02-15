import {
  Button,
  Grid,
  Hidden,
  Theme,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { ChevronLeft, ChevronRight } from '@material-ui/icons';
import { findIndex, get, isEqual } from 'lodash';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Draggable, { DraggableEvent } from 'react-draggable';
import { useDispatch, useSelector } from 'react-redux';
import { DateRangeType } from 'config/types';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { addNotification } from 'context/notificationStateSlice';
import { locales, useSafeTranslation } from 'i18n';
import {
  dateStrToUpperCase,
  datesAreEqualWithoutTime,
  getFormattedDate,
} from 'utils/date-utils';
import {
  MONTH_FIRST_DATE_FORMAT,
  MONTH_ONLY_DATE_FORMAT,
} from 'utils/name-utils';
import { useUrlHistory } from 'utils/url-utils';
import useLayers from 'utils/layers-utils';
import { format } from 'date-fns';
import { ReactComponent as TickSvg } from './tick.svg';
import DateSelectorInput from './DateSelectorInput';
import TimelineItems from './TimelineItems';
import { TIMELINE_ITEM_WIDTH, USER_DATE_OFFSET, findDateIndex } from './utils';
import { oneDayInMs } from '../LeftPanel/utils';

type Point = {
  x: number;
  y: number;
};

const TIMELINE_ID = 'dateTimelineSelector';
const POINTER_ID = 'datePointerSelector';

const DateSelector = memo(({ classes }: DateSelectorProps) => {
  const {
    selectedLayerDates: availableDates,
    selectedLayersWithDateSupport: selectedLayers,
  } = useLayers();
  const { startDate: stateStartDate } = useSelector(dateRangeSelector);
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

  const dateRef = useRef(availableDates);
  const timeLine = useRef(null);

  const { t } = useSafeTranslation();
  const { updateHistory } = useUrlHistory();
  const dispatch = useDispatch();

  const maxDate = useMemo(() => {
    return new Date(Math.max(...availableDates, new Date().getTime()));
  }, [availableDates]);

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

  const locale = useMemo(() => {
    return t('date_locale') ? t('date_locale') : 'en';
  }, [t]);

  const range = useMemo(() => {
    const startDate = stateStartDate ? new Date(stateStartDate) : new Date();
    const year = startDate.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31); // December is 11th month
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
      date.setHours(12, 0, 0, 0);
      return {
        value: date.getTime(),
        label: dateStrToUpperCase(
          format(date, MONTH_FIRST_DATE_FORMAT, {
            locale: locales[locale as keyof typeof locales],
          }),
        ),
        month: dateStrToUpperCase(
          format(date, MONTH_ONLY_DATE_FORMAT, {
            locale: locales[locale as keyof typeof locales],
          }),
        ),
        date: getFormattedDate(date, 'default') as string,
        isFirstDay: date.getDate() === 1,
      };
    });
  }, [locale, stateStartDate]);

  const dateIndex = useMemo(() => {
    return findIndex(
      range,
      date =>
        !!stateStartDate &&
        datesAreEqualWithoutTime(date.value, stateStartDate),
    );
  }, [range, stateStartDate]);

  // Create timeline range and set pointer position
  useEffect(() => {
    setDateRange(range);
    setPointerPosition({
      x: dateIndex * TIMELINE_ITEM_WIDTH,
      y: 0,
    });
  }, [dateIndex, range]);

  const updateStartDate = useCallback(
    (date: Date, isUpdatingHistory: boolean) => {
      if (!isUpdatingHistory) {
        return;
      }
      const time = date.getTime();
      const startDate = new Date(stateStartDate as number);
      const dateEqualsToStartDate = datesAreEqualWithoutTime(date, startDate);
      if (dateEqualsToStartDate) {
        return;
      }
      // This updates state because a useEffect in MapView updates the redux state
      // TODO this is convoluted coupling, we should update state here if feasible.
      updateHistory('date', getFormattedDate(time, 'default') as string);
    },
    [stateStartDate, updateHistory],
  );

  const addUserOffset = useCallback((dates: number[]) => {
    return dates.map(d => {
      return d + USER_DATE_OFFSET;
    });
  }, []);

  const dates = useMemo(() => {
    return addUserOffset(availableDates);
  }, [addUserOffset, availableDates]);

  const setDatePosition = useCallback(
    (
      date: number | undefined,
      increment: number,
      isUpdatingHistory: boolean,
    ) => {
      const selectedIndex = findDateIndex(dates, date);
      if (dates[selectedIndex + increment]) {
        updateStartDate(
          new Date(dates[selectedIndex + increment]),
          isUpdatingHistory,
        );
      }
    },
    [dates, updateStartDate],
  );

  // move pointer to closest date when change map layer
  useEffect(() => {
    if (isEqual(dateRef.current, availableDates)) {
      return;
    }
    setDatePosition(stateStartDate, 0, false);
    dateRef.current = availableDates;
  });

  const incrementDate = useCallback(() => {
    setDatePosition(stateStartDate, 1, true);
  }, [setDatePosition, stateStartDate]);

  const decrementDate = useCallback(() => {
    setDatePosition(stateStartDate, -1, true);
  }, [setDatePosition, stateStartDate]);

  const includedDates = useMemo(() => {
    return dates?.map(d => new Date(d)) ?? [];
  }, [dates]);

  const checkIntersectingDateAndShowPopup = useCallback(
    (selectedDate: Date, positionY: number) => {
      const findDateInIntersectingDates = includedDates.find(date => {
        return datesAreEqualWithoutTime(date, selectedDate);
      });
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
    [dateIndex, dispatch, includedDates, t],
  );

  // Click on available date to move the pointer
  const clickDate = (index: number) => {
    const selectedIndex = findDateIndex(dates, dateRange[index].value);
    if (
      selectedIndex < 0 ||
      (stateStartDate &&
        datesAreEqualWithoutTime(dates[selectedIndex], stateStartDate))
    ) {
      return;
    }
    setPointerPosition({ x: index * TIMELINE_ITEM_WIDTH, y: 0 });
    const updatedDate = new Date(dates[selectedIndex]);
    checkIntersectingDateAndShowPopup(new Date(dateRange[index].value), 0);
    updateStartDate(updatedDate, true);
  };

  // Set timeline position after being dragged
  const onTimelineStop = useCallback((e: DraggableEvent, position: Point) => {
    setTimelinePosition(position);
  }, []);

  const onPointerStart = useCallback((e: DraggableEvent) => {
    e.stopPropagation();
  }, []);

  // Set pointer position after being dragged
  const onPointerStop = useCallback(
    (e: DraggableEvent, position: Point) => {
      const exactX = Math.round(position.x / TIMELINE_ITEM_WIDTH);
      if (exactX >= dateRange.length) {
        return;
      }
      const selectedIndex = findDateIndex(dates, dateRange[exactX].value);
      if (selectedIndex < 0 || dates[selectedIndex] === stateStartDate) {
        return;
      }
      setPointerPosition({
        x: exactX * TIMELINE_ITEM_WIDTH,
        y: position.y,
      });
      const updatedDate = new Date(dates[selectedIndex]);
      checkIntersectingDateAndShowPopup(
        new Date(dateRange[exactX].value),
        position.y,
      );
      updateStartDate(updatedDate, true);
    },
    [
      checkIntersectingDateAndShowPopup,
      dateRange,
      dates,
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
    <div className={classes.container}>
      <Grid
        container
        alignItems="center"
        justifyContent="center"
        className={classes.datePickerContainer}
      >
        {/* Mobile */}
        <Grid item xs={12} sm={1} className={classes.datePickerGrid}>
          <Hidden smUp>
            <Button onClick={decrementDate}>
              <ChevronLeft style={{ color: '#101010' }} />
            </Button>
          </Hidden>

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
            includeDates={includedDates}
          />

          <Hidden smUp>
            <Button onClick={incrementDate}>
              <ChevronRight style={{ color: '#101010' }} />
            </Button>
          </Hidden>
        </Grid>

        {/* Desktop */}
        <Grid item xs={12} sm className={classes.slider}>
          <Hidden xsDown>
            <Button onClick={decrementDate} className={classes.chevronDate}>
              <ChevronLeft />
            </Button>
          </Hidden>
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
                      selectedLayers={selectedLayers}
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
                >
                  <div className={classes.pointer} id={POINTER_ID}>
                    <TickSvg />
                  </div>
                </Draggable>
              </div>
            </Draggable>
          </Grid>
          <Hidden xsDown>
            <Button onClick={incrementDate} className={classes.chevronDate}>
              <ChevronRight />
            </Button>
          </Hidden>
        </Grid>
      </Grid>
    </div>
  );
});

const styles = (theme: Theme) =>
  createStyles({
    container: {
      position: 'absolute',
      bottom: '40px',
      width: '100%',
      zIndex: 5,
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
      borderRadius: theme.shape.borderRadius,
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
      position: 'relative',
      top: 8,
    },

    pointer: {
      cursor: 'pointer',
      position: 'absolute',
      zIndex: 5,
      top: -20,
      left: -9,
      height: '16px',
      pointerEvents: 'none',
    },
  });

export interface DateSelectorProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(DateSelector);
