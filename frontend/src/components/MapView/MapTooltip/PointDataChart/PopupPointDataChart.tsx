import Chart from 'components/Common/Chart';
import { buildCsvFileName, isAdminBoundary } from 'components/MapView/utils';
import { ChartConfig } from 'config/types';
import {
  CHART_DATA_PREFIXES,
  datasetSelector,
} from 'context/datasetStateSlice';
import { t } from 'i18next';
import React, { memo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import DownloadCsvButton from 'components/MapView/DownloadCsvButton';
import { appConfig } from 'config';

const styles = () =>
  createStyles({
    chartSection: {
      height: '240px',
      width: '400px',
    },
  });

const { countryAdmin0Id, country, multiCountry } = appConfig;

interface PopupDatasetChartProps extends WithStyles<typeof styles> {
  adminLevelsNames: () => string[];
}
const PopupPointDataChart = ({
  adminLevelsNames,
  classes,
}: PopupDatasetChartProps) => {
  const dataForCsv = useRef<{ [key: string]: any[] }>({});
  const { data: dataset, datasetParams, title, chartType } = useSelector(
    datasetSelector,
  );
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

  dataForCsv.current = {
    ...dataForCsv.current,
    [title]: dataset.rows,
  };

  return (
    <>
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
        />
      </div>
      <DownloadCsvButton
        filesData={[
          {
            fileName: buildCsvFileName([
              multiCountry ? countryAdmin0Id : country,
              ...adminLevelsNames(),
              title,
            ]),
            data: dataForCsv,
          },
        ]}
      />
    </>
  );
};

export default memo(withStyles(styles)(PopupPointDataChart));
