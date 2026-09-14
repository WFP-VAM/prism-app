import { Box } from '@mui/material';
import Chart from 'components/Common/Chart';
import { ChartConfig } from 'config/types';
import {
  CHART_DATA_PREFIXES,
  datasetSelector,
} from 'context/datasetStateSlice';
import { t } from 'i18next';
import { memo } from 'react';
import { useSelector } from 'react-redux';
import { isAdminBoundary } from 'utils/admin-utils';
import { GoogleFloodParams } from 'utils/google-flood-utils';

import {
  pointDataChartContainerSx,
  pointDataChartSectionSx,
} from '../mapTooltipStyles';

const PopupPointDataChart = memo(() => {
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
    <Box sx={pointDataChartContainerSx}>
      <Box sx={pointDataChartSectionSx}>
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
      </Box>
    </Box>
  );
});

export default PopupPointDataChart;
