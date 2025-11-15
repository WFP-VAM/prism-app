import { createStyles, makeStyles } from '@material-ui/core';
import ChartSection from 'components/MapView/LeftPanel/ChartsPanel/ChartSection';
import { oneYearInMs } from 'components/MapView/LeftPanel/utils';
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
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { useBoundaryData } from 'utils/useBoundaryData';
import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { appConfig } from 'config';
import { useSafeTranslation } from 'i18n';
import { getLayerMapId } from 'utils/map-utils';
import PopupChartWrapper from './PopupChartWrapper';

const { country } = appConfig;

const useStyles = makeStyles(() =>
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
  }),
);

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

interface PopupChartProps {
  filteredChartLayers: WMSLayerProps[];
  adminCode: AdminCodeString;
  adminSelectorKey: string;
  adminLevel: AdminLevelType;
  adminLevelsNames: () => string[];
}

function PopupAnalysisCharts({
  filteredChartLayers,
  adminCode,
  adminSelectorKey,
  adminLevel,
  adminLevelsNames,
}: PopupChartProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dataForCsv = useRef<{ [key: string]: any[] }>({});
  const { data } = useBoundaryData(boundaryLayer.id);
  const map = useSelector(mapSelector);

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const chartEndDate = selectedDate || new Date().getTime();
  const chartStartDate = chartEndDate - oneYearInMs;

  const layerId = getLayerMapId(boundaryLayer.id, 'fill');
  const features = map?.queryRenderedFeatures(undefined, { layers: [layerId] });

  const adminProperties =
    data && boundaryLayer?.format === 'geojson'
      ? getProperties(data as BoundaryLayerData, adminCode, adminSelectorKey)
      : (features?.find(f => f.properties?.[adminSelectorKey] === adminCode)
          ?.properties ?? null);

  if (filteredChartLayers.length < 1) {
    return null;
  }

  return (
    <PopupChartWrapper>
      {filteredChartLayers.map(filteredChartLayer => (
        <div key={filteredChartLayer.id} className={classes.chartContainer}>
          <div className={classes.chartSection}>
            <ChartSection
              key={`${filteredChartLayer.id}-${adminCode}-${adminLevel}-${chartStartDate}-${chartEndDate}`}
              chartLayer={filteredChartLayer}
              adminProperties={adminProperties}
              adminLevel={adminLevel}
              startDate={chartStartDate}
              endDate={chartEndDate}
              dataForCsv={dataForCsv}
              chartProps={{
                showDownloadIcons: true,
                iconStyles: { color: 'white' },
                downloadFilenamePrefix: [t(country), ...adminLevelsNames()],
              }}
            />
          </div>
        </div>
      ))}
    </PopupChartWrapper>
  );
}

export default PopupAnalysisCharts;
