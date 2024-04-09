import {
  Button,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
  setAAView,
} from 'context/anticipatoryActionStateSlice';
import {
  AAView,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryActionStateSlice/types';
import { gray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Equalizer } from '@material-ui/icons';
import { getAAColor, getAAIcon, useAACommonStyles } from '../utils';
import { dateSorter } from '../DistrictView/utils';
import { timelineTransform } from './utils';

interface TimelineItemProps {
  item: AnticipatoryActionDataRow;
}

function TimelineItem({ item }: TimelineItemProps) {
  const classes = useTimelineItemStyles();
  const { t } = useSafeTranslation();

  const color = getAAColor(item.category, item.isValid ? item.phase : 'na');

  return (
    <div className={classes.wrapper} style={{ border: `1px solid ${color}` }}>
      <Typography variant="h3">{item.probability}</Typography>
      <Typography>
        {t('trig.')} {item.trigger}
      </Typography>
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
      <Typography style={{ whiteSpace: 'nowrap' }}>{item.index}</Typography>
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

interface TimelineProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function Timeline({ dialogs }: TimelineProps) {
  const classes = useTimelineStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const AAData = useSelector(AADataSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const AAFilters = useSelector(AAFiltersSelector);

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.auto));
  }, [dispatch]);

  const timelineButtons = [
    {
      icon: Equalizer,
      text: 'Forecast',
      onClick: () => dispatch(setAAView(AAView.Forecast)),
    },
  ];

  const { windowData, allRows } = timelineTransform({
    filters: AAFilters,
    data: AAData,
    selectedDistrict,
  });

  return (
    <>
      <div className={classes.root}>
        {Object.entries(windowData).map(([win, winData]) => {
          if (!winData || Object.keys(winData.rows).length === 0) {
            return (
              <div key={win} className={classes.windowWrapper}>
                {t('No Data')}{' '}
              </div>
            );
          }
          const { months, rows } = winData;

          return (
            <div key={win} className={classes.windowWrapper}>
              <div className={classes.tableWrapper}>
                <div className={classes.headRowWrapper}>
                  <div className={classes.iconColumn} />
                  {months.map(([date, label]) => (
                    <div key={date} className={classes.headColumn}>
                      <Typography className={classes.monthText}>
                        {t(label)}
                      </Typography>
                    </div>
                  ))}
                </div>
                {
                  // eslint-disable-next-line fp/no-mutating-methods
                  Object.entries({ ...allRows, ...rows })
                    .sort(dateSorter)
                    .map(([rowId, rowData]) => (
                      <div key={rowId} className={classes.rowWrapper}>
                        <div className={classes.iconColumn}>
                          {getAAIcon(
                            rowData.status.category,
                            rowData.status.phase,
                          )}
                        </div>
                        {months.map(([date, label]) => {
                          const elem = rowData.data.find(z => z.date === date);
                          if (!elem) {
                            return (
                              <div key={date} className={classes.column} />
                            );
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
      <div className={commonClasses.footerWrapperVert}>
        <div className={commonClasses.footerActionsWrapper}>
          {timelineButtons.map(x => (
            <Button
              key={x.text}
              className={commonClasses.footerButton}
              variant="outlined"
              fullWidth
              onClick={x.onClick}
              startIcon={<x.icon />}
            >
              <Typography>{t(x.text)}</Typography>
            </Button>
          ))}
        </div>
        <div className={commonClasses.footerDialogsWrapperVert}>
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              className={commonClasses.footerDialog}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {t(dialog.text)}
            </Typography>
          ))}
        </div>
      </div>
    </>
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
      minHeight: '5.3rem',
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
