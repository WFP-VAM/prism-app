import Chart from 'components/Common/Chart';

import { makeStyles, createStyles } from '@mui/styles';
import { ChartConfig } from 'config/types';
import {
  CHART_DATA_PREFIXES,
  datasetSelector,
} from 'context/datasetStateSlice';
import { t } from 'i18next';
import { memo } from 'react';
import { useSelector } from 'react-redux';
;
import { isAdminBoundary } from 'utils/admin-utils';
import { GoogleFloodParams } from 'utils/google-flood-utils';

const useStyles = makeStyles(() =>
  createStyles({
    chartContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      paddingTop: '8px', // leave room for the close icon
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

  const xAxisLabel = isAdminBoundary(datasetParams)
    ? undefined
    : t('Timestamps reflect local time in region');
  const yAxisLabel = (datasetParams as GoogleFloodParams).yAxisLabel
    ? t((datasetParams as GoogleFloodParams).yAxisLabel)
    : undefined;

  return (
    <div className={classes.chartContainer}>
      <div className={classes.chartSection}>
        <Chart
          title={t(title, datasetParams)}
          config={config}
          data={dataset}
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          showDownloadIcons
          iconStyles={{ color: 'white', marginTop: '20px' }}
          units={t((datasetParams as GoogleFloodParams).unit)}
        />
      </div>
    </div>
  );
});

export default PopupPointDataChart;
