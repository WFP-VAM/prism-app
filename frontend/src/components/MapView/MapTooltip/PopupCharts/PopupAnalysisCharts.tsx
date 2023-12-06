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
  name: string,
) => {
  const features = layerData.features.filter(
    elem => elem.properties && elem.properties[name],
  );

  if (!features) {
    return null;
  }
  return features[0].properties;
};

interface PopupChartProps extends WithStyles<typeof styles> {
  filteredChartLayers: WMSLayerProps[];
  adminLevel: AdminLevelType;
  onClose: React.Dispatch<React.SetStateAction<AdminLevelType | undefined>>;
  adminLevelsNames: () => string[];
}
const PopupAnalysisCharts = ({
  filteredChartLayers,
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

  const levelsConfiguration = filteredChartLayers.map(item => ({
    name: item.id,
    levels: item.chartData?.levels,
  }));

  const { startDate: endDate } = useSelector(dateRangeSelector);
  const startDate = (endDate || new Date().getTime()) - oneYearInMs;

  return (
    <PopupChartWrapper onClose={onClose}>
      {filteredChartLayers.map(filteredChartLayer => (
        <div key={filteredChartLayer.id} className={classes.chartContainer}>
          <div className={classes.chartSection}>
            <ChartSection
              chartLayer={filteredChartLayer}
              adminProperties={getProperties(
                data as BoundaryLayerData,
                levelsConfiguration
                  .find(
                    levelConfiguration =>
                      levelConfiguration.name === filteredChartLayer.id,
                  )
                  ?.levels?.find(level => level.level === adminLevel.toString())
                  ?.name ?? '',
              )}
              adminLevel={adminLevel}
              startDate={startDate as number}
              endDate={endDate as number}
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
