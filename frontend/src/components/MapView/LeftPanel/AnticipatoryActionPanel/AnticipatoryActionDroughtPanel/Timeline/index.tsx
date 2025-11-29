import { Button, Typography } from '@mui/material';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
  setAAFilters,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAView,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { lightGrey } from 'muiTheme';
import { makeStyles, createStyles } from '@mui/styles';
import { useDispatch, useSelector } from 'context/hooks';
import { useSafeTranslation } from 'i18n';
import { Equalizer, Reply } from '@mui/icons-material';
import { getAAColor, getAAIcon } from '../utils';
import { useAACommonStyles } from '../../utils';
import { dateSorter } from '../DistrictView/utils';
import { timelineTransform } from './utils';

interface TimelineItemProps {
  item: AnticipatoryActionDataRow;
}

function TimelineItem({ item }: TimelineItemProps) {
  const classes = useTimelineItemStyles();
  const { t } = useSafeTranslation();

  const color = getAAColor(item.category, item.isValid ? item.phase : 'na');

  // Calculate font size based on character count
  const calculateFontSize = (text: string) => {
    const baseSize = 0.8; // rem
    const minSize = 0.2; // rem
    const charCount = text.length;
    return Math.max(baseSize - (charCount - 6) * 0.05, minSize);
  };

  const fontSize = calculateFontSize(item.index);

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
      <Typography
        className={classes.indexText}
        style={{
          fontSize: `${fontSize}rem`,
        }}
      >
        {item.index}
      </Typography>
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
    indexText: {
      whiteSpace: 'nowrap',
      lineHeight: '1.2rem',
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

  const timelineButtons = [
    {
      icon: Reply,
      text: 'Back',
      onClick: () => {
        dispatch(setAAFilters({ selectedIndex: '' }));
        dispatch(setAAView(AAView.District));
      },
    },
    {
      icon: Equalizer,
      text: 'Forecast',
      onClick: () => {
        dispatch(setAAFilters({ selectedIndex: '' }));
        dispatch(setAAView(AAView.Forecast));
      },
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
              <Typography variant="h4" className={commonClasses.windowHeader}>
                {t(win)}
              </Typography>
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
                        {months.map(([date, _label]) => {
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
      background: lightGrey,
      overflow: 'auto',
      justifyContent: 'space-around',
      overflowY: 'scroll',
      // Browser-specific properties for forcing scrollbar visibility and styling
      '&::-webkit-scrollbar': {
        width: '0.5rem',
        height: '0.5rem',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#888',
        borderRadius: '0.25rem', // Rounded corners for the scrollbar thumb
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: '#555',
      },
      '&::-webkit-scrollbar-track': {
        borderRadius: '0.25rem', // Rounded corners for the scrollbar track
      },
    },
    windowWrapper: {
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem 0.25rem',
      color: 'black',
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
      background: lightGrey,
      borderRadius: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
    },
  }),
);

export default Timeline;
