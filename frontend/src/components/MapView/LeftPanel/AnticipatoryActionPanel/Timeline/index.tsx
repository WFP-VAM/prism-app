import { Typography, createStyles, makeStyles } from '@material-ui/core';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
} from 'context/anticipatoryActionStateSlice';
import {
  AAPhase,
  AAcategory,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryActionStateSlice/types';
import { gray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import { AAWindowKeys } from 'config/utils';
import { getAAColor, getAAIcon } from '../utils';

interface TimelineItemProps {
  item: AnticipatoryActionDataRow;
}

function TimelineItem({ item }: TimelineItemProps) {
  const classes = useTimelineItemStyles();

  const color = getAAColor(item.category, item.isValid ? item.phase : 'na');

  return (
    <div className={classes.wrapper} style={{ border: `1px solid ${color}` }}>
      <Typography variant="h3">{item.probability}</Typography>
      <Typography>trig. {item.trigger}</Typography>
      <div
        className={classes.probabilityBar}
        style={{
          backgroundColor: color,
          width: `${item.probability * 100}%`,
        }}
      />
      <div
        className={classes.triggerBar}
        style={{
          width: `${item.trigger * 100}%`,
        }}
      />
      <Typography>{item.index}</Typography>
    </div>
  );
}

const useTimelineItemStyles = makeStyles(() =>
  createStyles({
    wrapper: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '2px',
      boxSizing: 'border-box',
      padding: '0.25rem',
    },
    probabilityBar: {
      height: '0.3rem',
      marginBottom: '0.25rem',
      borderRadius: '0 2px 2px 0',
    },
    triggerBar: {
      height: '0.25rem',
      backgroundColor: 'black',
      borderRadius: '0 2px 2px 0',
    },
  }),
);

function getColumnKey(val: AnticipatoryActionDataRow): number {
  const { category, phase, isValid } = val;
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseIndex = AAPhase.findIndex(x => x === phase);
  if (!isValid) {
    return catIndex * 10;
  }
  return catIndex * 10 + phaseIndex;
}

function Timeline() {
  const classes = useTimelineStyles();
  const dispatch = useDispatch();
  const AAData = useSelector(AADataSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const { selectedWindow, selectedIndex, categories } = useSelector(
    AAFiltersSelector,
  );

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.undef));
  }, [dispatch]);

  const windowData = (selectedWindow === 'All'
    ? AAWindowKeys
    : [selectedWindow]
  ).map(win => {
    const data = !!selectedDistrict && AAData[win][selectedDistrict];
    if (!data) {
      return [win, null];
    }

    const filtered = data.filter(
      x =>
        !x.computedRow &&
        (selectedIndex === '' || selectedIndex === x.index) &&
        categories[x.category],
    );

    const months = [...new Set(filtered.map(x => x.date))].map(x => [
      x,
      new Date(x).toLocaleString('en-US', { month: 'short' }),
    ]);

    const categoriesMap = new Map<number, AnticipatoryActionDataRow[]>();
    filtered.forEach(x => {
      const key = getColumnKey(x);
      const val = categoriesMap.get(key);
      categoriesMap.set(key, val ? [...val, x] : [x]);
    });
    return [win, { months, data: Object.fromEntries(categoriesMap) }];
  }) as [
    typeof AAWindowKeys[number],
    {
      months: string[][];
      data: {
        [k: string]: AnticipatoryActionDataRow[];
      };
    } | null,
  ][];

  return (
    <div className={classes.root}>
      {windowData.map(([win, winData]) => {
        if (winData === null || Object.keys(windowData).length === 0) {
          return (
            <div key={win} className={classes.windowWrapper}>
              No Data{' '}
            </div>
          );
        }
        const { months, data } = winData;
        return (
          <div key={win} className={classes.windowWrapper}>
            <div className={classes.tableWrapper}>
              <div className={classes.headRowWrapper}>
                <div className={classes.iconColumn} />
                {months.map(([date, label]) => (
                  <div key={date} className={classes.headColumn}>
                    <Typography className={classes.monthText}>
                      {label}
                    </Typography>
                  </div>
                ))}
              </div>
              {
                // eslint-disable-next-line fp/no-mutating-methods
                Object.entries(data)
                  .sort((a, b) => {
                    if (a[0] > b[0]) {
                      return -1;
                    }
                    if (a[0] < b[0]) {
                      return 1;
                    }
                    return 0;
                  })
                  .map(([rowId, rowData]) => (
                    <div key={rowId} className={classes.rowWrapper}>
                      <div className={classes.iconColumn}>
                        {getAAIcon(
                          rowData[0].category,
                          rowData[0].isValid ? rowData[0].phase : 'na',
                        )}
                      </div>
                      {months.map(([date, label]) => {
                        const elem = rowData.find(z => z.date === date);
                        if (!elem) {
                          return <div key={date} className={classes.column} />;
                        }
                        return (
                          <div key={date} className={classes.column}>
                            <TimelineItem item={elem} />
                          </div>
                        );
                      })}
                    </div>
                  ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

const useTimelineStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      background: gray,
      overflow: 'scroll',
      justifyContent: 'space-around',
    },
    windowWrapper: {
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem 0.25rem',
    },
    tableWrapper: { display: 'flex', flexDirection: 'column', gap: '2px' },
    headRowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '2.5rem',
      background: 'white',
    },
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '5rem',
      background: 'white',
    },
    iconColumn: {
      width: '3rem',
      padding: '0.1rem 0.25rem',
    },
    headColumn: {
      width: '4rem',
      padding: '0.1rem 0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    column: {
      width: '4rem',
      padding: '0.1rem 0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthText: {
      background: gray,
      borderRadius: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
    },
  }),
);

export default Timeline;
