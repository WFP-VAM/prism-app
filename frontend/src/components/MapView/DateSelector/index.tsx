import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  createStyles,
  Grid,
  Hidden,
  Theme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import DatePicker from 'react-datepicker';
import Draggable, { DraggableEvent } from 'react-draggable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretUp } from '@fortawesome/free-solid-svg-icons';
import { ChevronLeft, ChevronRight } from '@material-ui/icons';
import 'react-datepicker/dist/react-datepicker.css';
import { findIndex, get, isEqual } from 'lodash';
import { useUrlHistory } from '../../../utils/url-utils';
import { DateRangeType } from '../../../config/types';
import { findDateIndex, TIMELINE_ITEM_WIDTH, USER_DATE_OFFSET } from './utils';
import { dateRangeSelector } from '../../../context/mapStateSlice/selectors';
import TimelineItems from './TimelineItems';
import { moment, useSafeTranslation } from '../../../i18n';
import {
  DEFAULT_DATE_FORMAT,
  MONTH_FIRST_DATE_FORMAT,
  MONTH_ONLY_DATE_FORMAT,
} from '../../../utils/name-utils';
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
} from '../../../utils/server-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import DateSelectorInput from './DateSelectorInput';
import { addNotification } from '../../../context/notificationStateSlice';

type Point = {
  x: number;
  y: number;
};

const TIMELINE_ID = 'dateTimelineSelector';
const POINTER_ID = 'datePointerSelector';

const DateSelector = memo(
  ({
    availableDates = [],
    selectedLayers = [],
    classes,
  }: DateSelectorProps) => {
    const { startDate: stateStartDate } = useSelector(dateRangeSelector);
    const serverAvailableDates = useSelector(availableDatesSelector);
    const [dateRange, setDateRange] = useState<DateRangeType[]>([
      {
        value: 0,
        label: '',
        month: '',
        isFirstDay: false,
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

    const selectedLayerDates = useMemo(
      () =>
        selectedLayers.map(layer => {
          return getPossibleDatesForLayer(layer, serverAvailableDates)
            .filter(value => value) // null check
            .flat();
        }),
      [selectedLayers, serverAvailableDates],
    );
    const selectedLayerTitles = useMemo(
      () => selectedLayers.map(layer => layer.title),
      [selectedLayers],
    );

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

    const dateStrToUpperCase = useCallback((dateStr: string): string => {
      return `${dateStr.slice(0, 1).toUpperCase()}${dateStr.slice(1)}`;
    }, []);

    const locale = useMemo(() => {
      return t('date_locale') ? t('date_locale') : 'en';
    }, [t]);

    const range = useMemo(() => {
      return Array.from(
        moment()
          .range(
            moment(stateStartDate).startOf('year'),
            moment(stateStartDate).endOf('year'),
          )
          .by('days'),
      ).map(date => {
        date.locale(locale);
        return {
          value: date.valueOf(),
          label: dateStrToUpperCase(date.format(MONTH_FIRST_DATE_FORMAT)),
          month: dateStrToUpperCase(date.format(MONTH_ONLY_DATE_FORMAT)),
          isFirstDay: date.date() === date.startOf('month').date(),
        };
      });
    }, [dateStrToUpperCase, locale, stateStartDate]);

    const dateIndex = useMemo(() => {
      return findIndex(range, date => {
        return (
          date.label ===
          moment(stateStartDate).locale(locale).format(MONTH_FIRST_DATE_FORMAT)
        );
      });
    }, [locale, range, stateStartDate]);

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
        const dateEqualsToStartDate =
          date.getDate() === startDate.getDate() &&
          date.getMonth() === startDate.getMonth() &&
          date.getFullYear() === startDate.getFullYear();
        if (dateEqualsToStartDate) {
          return;
        }
        // This updates state because a useEffect in MapView updates the redux state
        // TODO this is convoluted coupling, we should update state here if feasible.
        updateHistory('date', moment(time).format(DEFAULT_DATE_FORMAT));
      },
      [stateStartDate, updateHistory],
    );

    const addUserOffset = useCallback((dates: number[]) => {
      return dates.map(d => {
        return d + USER_DATE_OFFSET;
      });
    }, []);

    const setDatePosition = useCallback(
      (
        date: number | undefined,
        increment: number,
        isUpdatingHistory: boolean,
      ) => {
        const dates = addUserOffset(availableDates);
        const selectedIndex = findDateIndex(dates, date);
        if (dates[selectedIndex + increment]) {
          updateStartDate(
            new Date(dates[selectedIndex + increment]),
            isUpdatingHistory,
          );
        }
      },
      [addUserOffset, availableDates, updateStartDate],
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

    const dates = useMemo(() => {
      return addUserOffset(availableDates);
    }, [addUserOffset, availableDates]);

    const includedDates = useMemo(() => {
      return availableDates?.map(d => new Date(d + USER_DATE_OFFSET)) ?? [];
    }, [availableDates]);

    const checkIntersectingDateAndShowPopup = useCallback(
      (selectedDate: Date, positionY: number) => {
        const findDateInIntersectingDates = includedDates.find(date => {
          return (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
          );
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
    const clickDate = useCallback(
      (index: number) => {
        const selectedIndex = findDateIndex(dates, dateRange[index].value);
        if (selectedIndex < 0 || dates[selectedIndex] === stateStartDate) {
          return;
        }
        setPointerPosition({ x: index * TIMELINE_ITEM_WIDTH, y: 0 });
        const updatedDate = new Date(dates[selectedIndex]);
        checkIntersectingDateAndShowPopup(new Date(dateRange[index].value), 0);
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
          justify="center"
          className={classes.datePickerContainer}
        >
          <Grid item xs={12} sm={1} className={classes.datePickerGrid}>
            <Hidden smUp>
              <Button onClick={decrementDate}>
                <ChevronLeft />
              </Button>
            </Hidden>

            <DatePicker
              locale={t('date_locale')}
              dateFormat="PP"
              className={classes.datePickerInput}
              selected={moment(stateStartDate).toDate()}
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
                <ChevronRight />
              </Button>
            </Hidden>
          </Grid>

          <Grid item xs={12} sm className={classes.slider}>
            <Hidden xsDown>
              <Button onClick={decrementDate}>
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
                    <TimelineItems
                      dateRange={dateRange}
                      intersectionDates={availableDates}
                      selectedLayerDates={selectedLayerDates}
                      clickDate={clickDate}
                      selectedLayerTitles={selectedLayerTitles}
                      locale={locale}
                    />
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
                      <FontAwesomeIcon
                        icon={faCaretUp}
                        style={{ fontSize: 40 }}
                        color="white"
                      />
                    </div>
                  </Draggable>
                </div>
              </Draggable>
            </Grid>
            <Hidden xsDown>
              <Button onClick={incrementDate}>
                <ChevronRight />
              </Button>
            </Hidden>
          </Grid>
        </Grid>
      </div>
    );
  },
);

const styles = (theme: Theme) =>
  createStyles({
    container: {
      position: 'absolute',
      bottom: '8%',
      width: '100%',
      zIndex: 5,
    },

    datePickerContainer: {
      backgroundColor: theme.palette.primary.main,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1),
      width: '90%',
      margin: 'auto',
      textAlign: 'center',
    },

    datePickerInput: {
      backgroundColor: theme.palette.primary.main,
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
      height: 36,
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
      top: 5,
    },

    pointer: {
      cursor: 'pointer',
      position: 'absolute',
      left: -12,
      top: -12,
    },
  });

export interface DateSelectorProps extends WithStyles<typeof styles> {
  availableDates?: number[];
  selectedLayers: DateCompatibleLayer[];
}

export default withStyles(styles)(DateSelector);
