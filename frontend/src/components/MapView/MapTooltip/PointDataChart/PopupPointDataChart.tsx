import Chart from 'components/Common/Chart';
import { isAdminBoundary } from 'components/MapView/utils';
import { ChartConfig } from 'config/types';
import {
  CHART_DATA_PREFIXES,
  datasetSelector,
} from 'context/datasetStateSlice';
import { t } from 'i18next';
import { memo } from 'react';
import { useSelector } from 'react-redux';
import { createStyles, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(() =>
  createStyles({
    chartContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      paddingTop: '20px', // leave room for the close icon
    },
    chartSection: {
      paddingTop: '16px', // leave room for the download icons
      height: '200px',
      width: '400px',
    },
  }),
);

const PopupPointDataChart = memo(() => {
  const classes = useStyles();
  const {
    data: dataset,
    datasetParams,
    title,
    chartType,
  } = useSelector(datasetSelector);
  const config: ChartConfig = {
    type: chartType,
    stacked: false,
    category: CHART_DATA_PREFIXES.date,
    data: CHART_DATA_PREFIXES.col,
    transpose: true,
    displayLegend: datasetParams && isAdminBoundary(datasetParams),
  };

  if (!dataset || !datasetParams) {
    return null;
  }

  return (
    <div className={classes.chartContainer}>
      <div className={classes.chartSection}>
        <Chart
          title={t(title)}
          config={config}
          data={dataset}
          xAxisLabel={
            isAdminBoundary(datasetParams)
              ? undefined
              : t('Timestamps reflect local time in Cambodia')
          }
          showDownloadIcons
          iconStyles={{ color: 'white', marginTop: '20px' }}
        />
      </div>
    </div>
  );
});

export default PopupPointDataChart;
