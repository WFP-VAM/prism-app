import {
  Tooltip,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { gray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import {
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
} from 'context/anticipatoryActionStateSlice';
import { AADataSeverityOrder, getAAIcon } from '../utils';
import { getActionsByPhaseCategoryAndWindow } from './actions';

function transform(
  data: AnticipatoryActionDataRow[] | undefined,
  filters: AnticipatoryActionState['filters'],
) {
  if (!data) {
    return undefined;
  }
  const { categories: categoryFilters, selectedIndex } = filters;

  const validData = data.filter(
    x =>
      (x.computedRow || x.isValid) &&
      categoryFilters[x.category] &&
      (selectedIndex === '' || x.index === selectedIndex),
  );

  const monthsMap = new Map<string, AnticipatoryActionDataRow[]>();
  validData.forEach(x => {
    const val = monthsMap.get(x.date);
    monthsMap.set(x.date, val ? [...val, x] : [x]);
  });

  // eslint-disable-next-line fp/no-mutating-methods
  const months = Array.from(monthsMap.keys()).sort();

  let prevMax: AnticipatoryActionDataRow | undefined;
  const topFiltered = months
    .map(date => {
      const dateData = monthsMap.get(date);
      if (!dateData) {
        // this should never happen
        throw new Error('Invalid Date');
      }

      if (dateData.filter(x => !x.computedRow).length === 0) {
        return [];
      }

      // eslint-disable-next-line fp/no-mutating-methods
      const sorted = dateData.sort((a, b) => {
        const aVal = AADataSeverityOrder(a.category, a.phase, 1);
        const bVal = AADataSeverityOrder(b.category, b.phase, 1);

        if (aVal > bVal) {
          return -1;
        }
        if (aVal < bVal) {
          return 1;
        }
        return 0;
      });
      if (prevMax === undefined) {
        // eslint-disable-next-line fp/no-mutation, prefer-destructuring
        prevMax = sorted[0];
        return [sorted[0]];
      }

      const ret = sorted.filter(
        x =>
          AADataSeverityOrder(x.category, x.phase, 1) >=
          AADataSeverityOrder(prevMax!.category, prevMax!.phase, 1),
      );

      // eslint-disable-next-line fp/no-mutation, prefer-destructuring
      prevMax = ret[0];

      return ret;
    })
    .flat();

  const sevMap = new Map<number, AnticipatoryActionDataRow[]>();
  topFiltered.forEach(x => {
    const sevVal = AADataSeverityOrder(x.category, x.phase, 1);
    const val = sevMap.get(sevVal);
    sevMap.set(sevVal, val ? [...val, x] : [x]);
  });

  const transformed = Object.fromEntries(sevMap);

  return {
    months: Object.fromEntries(
      [...new Set(topFiltered.map(x => x.date))].map(x => [
        x,
        new Date(x).toLocaleString('en-US', { month: 'long' }),
      ]),
    ),
    transformed,
  };
}

interface WindowColumnProps {
  win: typeof AAWindowKeys[number];
  transformed: ReturnType<typeof transform>;
  rowKeys: string[];
}

function WindowColumn({ win, transformed, rowKeys }: WindowColumnProps) {
  const classes = useWindowColumnStyles();

  const extendedTransformed = {
    ...Object.fromEntries(
      rowKeys.map(x => [x, [] as AnticipatoryActionDataRow[]]),
    ),
    ...(transformed?.transformed || {}),
  };

  const allEntries = Object.values(transformed?.transformed || {}).flat();

  if (!transformed) {
    return null;
  }

  return (
    <div className={classes.windowWrapper}>
      <div style={{ textAlign: 'center' }}>
        <Typography variant="h3" className={classes.headerText}>
          {win}
        </Typography>
      </div>
      <div className={classes.tableWrapper}>
        <div className={classes.headRowWrapper}>
          {Object.entries(transformed?.months || {}).map(x => (
            <div key={x[0]} className={classes.headColumn}>
              <Typography className={classes.monthText}>{x[1]}</Typography>
            </div>
          ))}
        </div>
        {
          // eslint-disable-next-line fp/no-mutating-methods
          Object.entries(extendedTransformed)
            .sort((a, b) => {
              if (a[0] > b[0]) {
                return -1;
              }
              if (a[0] < b[0]) {
                return 1;
              }
              return 0;
            })
            .map(x => (
              <div key={x[0]} className={classes.rowWrapper}>
                {Object.entries(transformed?.months || {}).map(y => {
                  const elem = x[1].find(z => z.date === y[0]);
                  if (!elem) {
                    return <div key={y[0]} className={classes.column} />;
                  }
                  return (
                    <div key={y[0]} className={classes.column}>
                      <div className={classes.iconWrapper}>
                        {getAAIcon(elem.category, elem.phase)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        }
      </div>
      <div className={classes.actionsWrapper}>
        <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
          <Typography variant="h3">ACTIONS</Typography>
        </div>
        <div className={classes.actionBoxesWrapper}>
          {Object.keys(transformed.months).map((x, i) => {
            const dateData = allEntries.filter(y => y.date === x);
            const elem = dateData.reduce(
              (max, curr) =>
                AADataSeverityOrder(max.category, max.phase) >
                AADataSeverityOrder(curr.category, curr.phase)
                  ? max
                  : curr,
              dateData[0],
            );
            const actions = getActionsByPhaseCategoryAndWindow(
              elem.phase,
              elem.category,
              elem.window,
            );
            return (
              <div
                id={String(x)}
                className={classes.actionBox}
                style={{
                  justifyContent: actions.length <= 2 ? 'center' : undefined,
                }}
              >
                {actions.map(action => (
                  // wrapping in div to show tooltip with FontAwesomeIcons
                  <Tooltip title={action.name}>
                    <div>{action.icon}</div>
                  </Tooltip>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const useWindowColumnStyles = makeStyles(() =>
  createStyles({
    windowWrapper: {
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem 0.25rem',
    },
    tableWrapper: { display: 'flex', flexDirection: 'column', gap: '2px' },
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '3rem',
      background: 'white',
    },
    headRowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '2.5rem',
      background: 'white',
    },
    headColumn: {
      width: '5.2rem',
      padding: '0.1rem 0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    column: {
      width: '5.2rem',
      height: '3.2rem',
      padding: '0.1rem 0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthText: {
      background: gray,
      borderRadius: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
    },
    iconWrapper: {
      width: '100%',
      height: '100%',
    },
    actionsWrapper: { display: 'flex', flexDirection: 'column', gap: '2px' },
    actionBoxesWrapper: {
      display: 'flex',
      flexDirection: 'row',
    },
    actionBox: {
      height: '6rem',
      width: '5.2rem',
      margin: '0.1rem 0.25rem',
      background: 'white',
      borderRadius: '4px',
      color: 'black',
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      paddingTop: '0.2rem',
    },
  }),
);

function DistrictView() {
  const dispatch = useDispatch();
  const classes = useDistrictViewStyles();
  const { selectedWindow } = useSelector(AAFiltersSelector);
  const rawAAData = useSelector(AADataSelector);
  const aaFilters = useSelector(AAFiltersSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);

  const windows = selectedWindow === 'All' ? AAWindowKeys : [selectedWindow];
  const transformed = windows.map(x =>
    transform(rawAAData[x][selectedDistrict], aaFilters),
  );
  const rowKeys = transformed
    .map(x => Object.keys(x?.transformed || {}))
    .flat();

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.undef));
  }, [dispatch]);

  return (
    <div className={classes.root}>
      <div className={classes.districtViewWrapper}>
        {windows.map((win, index) => (
          <WindowColumn
            key={win}
            win={win}
            transformed={transformed[index]}
            rowKeys={rowKeys}
          />
        ))}
      </div>
    </div>
  );
}

const useDistrictViewStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      background: gray,
      overflow: 'scroll',
    },
    districtViewWrapper: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      background: gray,
      overflow: 'scroll',
      justifyContent: 'center',
    },
  }),
);

export default DistrictView;
