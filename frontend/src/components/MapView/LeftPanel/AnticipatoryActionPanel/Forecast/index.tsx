import {
  Button,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import React from 'react';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Scatter } from 'react-chartjs-2';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelSize } from 'context/leftPanelStateSlice';
import { PanelSize } from 'config/types';
import { gray } from 'muiTheme';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
  setAAView,
} from 'context/anticipatoryActionStateSlice';
import {
  AACategoryType,
  AAView,
  AAcategory,
} from 'context/anticipatoryActionStateSlice/types';
import { useSafeTranslation } from 'i18n';
import { ClearAll } from '@material-ui/icons';
import { getAAColor, useAACommonStyles } from '../utils';
import { chartOptions, forecastTransform, getChartData } from './utils';

interface ForecastProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function Forecast({ dialogs }: ForecastProps) {
  const classes = useForecastStyle();
  const commonClasses = useAACommonStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const AAData = useSelector(AADataSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const filters = useSelector(AAFiltersSelector);

  React.useEffect(() => {
    dispatch(setPanelSize(PanelSize.large));
  }, [dispatch]);

  const { chartData, indexes } = forecastTransform({
    data: AAData,
    filters,
    selectedDistrict,
  });

  const forecastButtons = [
    {
      icon: ClearAll,
      text: t('Timeline'),
      onClick: () => dispatch(setAAView(AAView.Timeline)),
    },
  ];

  if (indexes.length === 0) {
    return (
      <div className={classes.noData}>
        <Typography>
          {t(
            `No data available yet for ${selectedDistrict}. Please pick a later date.`,
          )}
        </Typography>
      </div>
    );
  }

  return (
    <>
      <div className={classes.charts}>
        <div className={classes.chartsHeader}>
          <div style={{ minWidth: '3rem' }} />
          {indexes.map(x => (
            <Typography key={x} className={classes.label}>
              {t(x)}
            </Typography>
          ))}
          <div style={{ minWidth: '10px' }} />
        </div>

        {
          // eslint-disable-next-line fp/no-mutating-methods
          Object.entries(chartData)
            .filter(([sev, _]) => filters.categories[sev as AACategoryType])
            .sort((a, b) => {
              const indexA = AAcategory.findIndex(x => x === a[0]);
              const indexB = AAcategory.findIndex(x => x === b[0]);

              if (indexA > indexB) {
                return -1;
              }
              if (indexA < indexB) {
                return 1;
              }
              return 0;
            })
            .map(([sev, indexData]) => {
              const color = getAAColor(sev as AACategoryType, 'Ready');
              return (
                <div className={classes.chartLine} key={sev}>
                  <div
                    className={classes.textWrap}
                    style={{ backgroundColor: color }}
                  >
                    <Typography
                      variant="h3"
                      className={classes.text}
                      style={{
                        color: sev === 'Severe' ? 'white' : ' black',
                        border: `1px solid ${
                          sev === 'Severe' ? 'white' : ' black'
                        }`,
                      }}
                    >
                      {t(sev)}
                    </Typography>
                  </div>

                  <div className={classes.chartWrapper}>
                    <Scatter
                      data={getChartData(indexData, color) as any}
                      plugins={[ChartDataLabels]}
                      options={chartOptions as any}
                    />
                  </div>
                </div>
              );
            })
        }
      </div>
      <div className={commonClasses.footerWrapperVert}>
        <div className={commonClasses.footerActionsWrapper}>
          {forecastButtons.map(x => (
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

const useForecastStyle = makeStyles(() =>
  createStyles({
    noData: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    charts: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      background: gray,
    },
    chartsHeader: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      paddingLeft: '3rem',
      paddingRight: '0.5rem',
      marginBottom: '-1rem',
      background: 'white',
    },
    chartLine: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      background: 'white',
    },
    textWrap: {
      width: '3rem',
      display: 'flex',
      justifyContent: 'center',
    },
    text: {
      fontWeight: 400,
      borderRadius: '2px',
      writingMode: 'vertical-lr',
      textTransform: 'uppercase',
      transform: 'rotate(180deg)',
      padding: '0.5rem 0.1rem',
      margin: 'auto',
    },
    chartWrapper: {
      paddingBottom: '0.5rem',
      height: '7rem',
      width: '100%',
    },
    label: {
      background: gray,
      margin: '0.5rem',
      borderRadius: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
    },
  }),
);

export default Forecast;
