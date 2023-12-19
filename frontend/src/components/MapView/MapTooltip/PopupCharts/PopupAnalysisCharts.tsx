import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import DownloadCsvButton from 'components/MapView/DownloadCsvButton';
import ChartSection from 'components/MapView/LeftPanel/ChartsPanel/ChartSection';
import { oneYearInMs } from 'components/MapView/LeftPanel/utils';
import { buildCsvFileName } from 'components/MapView/utils';
import { appConfig } from 'config';
import {
  AdminLevelType,
  BoundaryLayerProps,
  WMSLayerProps,
  AdminCodeString,
} from 'config/types';
import { getBoundaryLayersByAdminLevel } from 'config/utils';
import { BoundaryLayerData } from 'context/layers/boundary';
import { LayerData } from 'context/layers/layer-data';
import {
  dateRangeSelector,
  layerDataSelector,
} from 'context/mapStateSlice/selectors';
import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import PopupChartWrapper from './PopupChartWrapper';

const styles = () =>
  createStyles({
    chartContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    chartSection: {
      height: '240px',
      width: '400px',
      flexGrow: 1,
    },
  });

const { countryAdmin0Id, country, multiCountry } = appConfig;

const boundaryLayer = getBoundaryLayersByAdminLevel();

const getProperties = (
  layerData: LayerData<BoundaryLayerProps>['data'],
  adminCode: AdminCodeString,
  adminSelectorKey: string,
) => {
  const features = layerData.features.find(
    elem =>
      elem.properties &&
      elem.properties[adminSelectorKey] &&
      elem.properties[adminSelectorKey] === adminCode,
  );

  if (!features) {
    return null;
  }
  return features.properties;
};

interface PopupChartProps extends WithStyles<typeof styles> {
  filteredChartLayers: WMSLayerProps[];
  adminCode: AdminCodeString;
  adminSelectorKey: string;
  adminLevel: AdminLevelType;
  onClose: React.Dispatch<React.SetStateAction<AdminLevelType | undefined>>;
  adminLevelsNames: () => string[];
}
const PopupAnalysisCharts = ({
  filteredChartLayers,
  adminCode,
  adminSelectorKey,
  adminLevel,
  onClose,
  adminLevelsNames,
  classes,
}: PopupChartProps) => {
  const dataForCsv = useRef<{ [key: string]: any[] }>({});
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const chartEndDate = selectedDate || new Date().getTime();
  const chartStartDate = chartEndDate - oneYearInMs;

  return (
    <PopupChartWrapper onClose={onClose}>
      {filteredChartLayers.map(filteredChartLayer => (
        <div key={filteredChartLayer.id} className={classes.chartContainer}>
          <div className={classes.chartSection}>
            <ChartSection
              chartLayer={filteredChartLayer}
              adminProperties={getProperties(
                data as BoundaryLayerData,
                adminCode,
                adminSelectorKey,
              )}
              adminLevel={adminLevel}
              startDate={chartStartDate}
              endDate={chartEndDate}
              dataForCsv={dataForCsv}
            />
          </div>
          <DownloadCsvButton
            filesData={[
              {
                fileName: buildCsvFileName([
                  multiCountry ? countryAdmin0Id : country,
                  ...adminLevelsNames(),
                  filteredChartLayer.title,
                ]),
                data: dataForCsv,
              },
            ]}
          />
        </div>
      ))}
    </PopupChartWrapper>
  );
};

export default withStyles(styles)(PopupAnalysisCharts);
