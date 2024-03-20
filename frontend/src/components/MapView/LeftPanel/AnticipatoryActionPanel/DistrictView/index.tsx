import { Typography, createStyles, makeStyles } from '@material-ui/core';
import { gray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import {
  AACategoryFiltersSelector,
  AASelectedWindowSelector,
  AnticipatoryActionDataSelector,
} from 'context/anticipatoryActionStateSlice';
import {
  AACategoryType,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import { AADataSeverityOrder, getAAIcon } from '../utils';

function transform(
  data: AnticipatoryActionDataRow[] | undefined,
  categoryFilters: Record<AACategoryType, boolean>,
) {
  if (!data) {
    return undefined;
  }

  const validData = data.filter(
    x =>
      x.probability !== 'NA' &&
      Number(x.probability) >= Number(x.trigger) &&
      categoryFilters[x.category],
  );

  const monthsMap = new Map<string, string>();
  validData.forEach(x => {
    monthsMap.set(
      x.date,
      new Date(x.date).toLocaleString('en-US', { month: 'long' }),
    );
  });
  const months = Object.fromEntries(monthsMap);

  const sevMap = new Map<number, AnticipatoryActionDataRow[]>();
  validData.forEach(x => {
    const sevVal = AADataSeverityOrder(x.category, x.phase, 1);
    const val = sevMap.get(sevVal);
    sevMap.set(sevVal, val ? [...val, x] : [x]);
  });

  const transformed = Object.fromEntries(sevMap);

  return { months, transformed };
}

interface WindowColumnProps {
  win: typeof AAWindowKeys[number];
  selectedDistrict: string;
}

function WindowColumn({ win, selectedDistrict }: WindowColumnProps) {
  const classes = useWindowColumnStyles();
  const rawAAData = useSelector(AnticipatoryActionDataSelector);
  const categoryFilters = useSelector(AACategoryFiltersSelector);

  const windowData = rawAAData[win][selectedDistrict];

  const transformed = transform(windowData, categoryFilters);

  return (
    <div className={classes.windowWrapper}>
      <div style={{ textAlign: 'center' }}>
        <Typography variant="h3" className={classes.headerText}>
          {win}
        </Typography>
      </div>
      <div className={classes.tableWrapper}>
        <div className={classes.rowWrapper}>
          {Object.entries(transformed?.months || {}).map(x => (
            <div key={x[0]} className={classes.column}>
              <Typography className={classes.monthText}>{x[1]}</Typography>
            </div>
          ))}
        </div>
        {
          // eslint-disable-next-line fp/no-mutating-methods
          Object.entries(transformed?.transformed || {})
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
  }),
);

interface DistrictViewProps {
  selectedDistrict: string;
}

function DistrictView({ selectedDistrict }: DistrictViewProps) {
  const dispatch = useDispatch();
  const classes = useDistrictViewStyles();
  const selectedWindow = useSelector(AASelectedWindowSelector);

  const windows = selectedWindow === 'All' ? AAWindowKeys : [selectedWindow];

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.undef));
  }, [dispatch]);

  return (
    <div className={classes.root}>
      <div className={classes.districtViewWrapper}>
        {windows.map(x => (
          <WindowColumn key={x} win={x} selectedDistrict={selectedDistrict} />
        ))}
      </div>
      <div className={classes.actionsWrapper}>
        <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
          <Typography variant="h3">ACTIONS</Typography>
        </div>
        <div className={classes.actionBoxesWrapper}>
          {[1, 2, 3, 4].map(x => (
            <div id={String(x)} className={classes.actionBox} />
          ))}
        </div>
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
    actionsWrapper: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      background: gray,
      justifyContent: 'center',
    },
    actionBoxesWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    actionBox: {
      height: '6rem',
      width: '20%',
      background: 'white',
      margin: '0.5rem 0',
    },
  }),
);

export default DistrictView;
