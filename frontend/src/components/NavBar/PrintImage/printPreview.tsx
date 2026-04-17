import { useContext, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { appConfig } from 'config';
import { AAMarkersSelector } from 'context/anticipatoryAction/AADroughtStateSlice';
import { AAFloodDataSelector } from 'context/anticipatoryAction/AAFloodStateSlice';
import { useFilteredFloodStations } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/useFilteredFloodStations';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import {
  Panel,
  AdminLevelDataLayerProps,
  SelectedDateTimestamp,
} from 'config/types';
import { LayerDefinitions } from 'config/utils';
import useLayers from 'utils/layers-utils';
import { getLayersCoverage } from 'utils/server-utils';
import {
  availableDatesSelector,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';

import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import PrintConfigContext from './printConfig.context';
import MapExportLayout from '../../MapExport/MapExportLayout';

function PrintPreview() {
  const { printConfig } = useContext(PrintConfigContext);
  const dispatch = useDispatch();

  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const availableDates = useSelector(availableDatesSelector);
  const AAMarkers = useSelector(AAMarkersSelector);
  const floodState = useSelector(AAFloodDataSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);

  const { logo } = appConfig.header || {};
  const { selectedLayersWithDateSupport } = useLayers();
  const selectedLayerId = printConfig?.selectedLayerId ?? null;

  useEffect(() => {
    if (selectedLayerId && !availableDates[selectedLayerId]) {
      dispatch(loadAvailableDatesForLayer(selectedLayerId));
    }
  }, [selectedLayerId, availableDates, dispatch]);

  const printSelectedLayers = useMemo(() => {
    if (
      printConfig?.toggles.batchMapsVisibility &&
      selectedLayerId &&
      LayerDefinitions[selectedLayerId]
    ) {
      return [LayerDefinitions[selectedLayerId]];
    }
    return [];
  }, [selectedLayerId, printConfig?.toggles.batchMapsVisibility]);

  const adminLevelLayersWithFillPattern = printSelectedLayers.filter(
    layer =>
      layer.type === 'admin_level_data' &&
      (layer.fillPattern || layer.legend.some(legend => legend.fillPattern)),
  ) as AdminLevelDataLayerProps[];

  const { shouldEnableBatchMaps, filteredBatchDates } = printConfig ?? {};
  const previewDate =
    shouldEnableBatchMaps && filteredBatchDates && filteredBatchDates.length > 0
      ? filteredBatchDates[filteredBatchDates.length - 1]
      : dateRange.startDate;

  const layersCoverage = useMemo(
    () =>
      getLayersCoverage(
        selectedLayersWithDateSupport.filter(
          layer =>
            layer.id !== 'anticipatory_action_flood' &&
            layer.id !== 'anticipatory_action_storm',
        ),
        previewDate as SelectedDateTimestamp,
      ),
    [previewDate, selectedLayersWithDateSupport],
  );

  const filteredFloodStations = useFilteredFloodStations(
    floodState.stationSummaryData,
    dateRange.startDate,
  );

  // Appease TS by ensuring printConfig is defined
  if (!printConfig || !selectedMap) {
    return null;
  }

  const {
    open,
    toggles,
    mapDimensions,
    titleText,
    titleRef,
    footerTextSize,
    footerText,
    footerRef,
    logoPosition,
    titleHeight,
    logoScale,
    legendPosition,
    legendScale,
    invertedAdminBoundaryLimitPolygon,
    printRef,
    footerHeight,
    bottomLogo,
    bottomLogoScale,
    setPreviewBounds,
    setPreviewZoom,
    setPreviewMapWidth,
    setPreviewMapHeight,
  } = printConfig;

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap.getStyle();

  // When batch maps has a selected layer, strip all raster layers from the
  // snapshot so the React layer component is the sole renderer (avoids stacking
  // regardless of which layer was active on the main map).
  if (selectedMapStyle && printSelectedLayers.length > 0) {
    const rasterLayersInSnapshot = selectedMapStyle.layers.filter(
      layer => layer.type === 'raster',
    );
    const sourcesToRemove = new Set(
      rasterLayersInSnapshot
        .map(layer => ('source' in layer ? (layer.source as string) : null))
        .filter(Boolean) as string[],
    );

    selectedMapStyle.layers = selectedMapStyle.layers.filter(
      layer => layer.type !== 'raster',
    );
    sourcesToRemove.forEach(sourceId => {
      delete selectedMapStyle.sources[sourceId];
    });
  }

  // Determine active panel for AA markers
  const activePanel =
    tabValue === Panel.AnticipatoryActionDrought ||
    tabValue === Panel.AnticipatoryActionFlood
      ? tabValue
      : undefined;

  if (!open) {
    return null;
  }

  if (selectedMapStyle && !toggles.mapLabelsVisibility) {
    selectedMapStyle.layers = selectedMapStyle?.layers.filter(
      x => !x.id.includes('label'),
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
      <MapExportLayout
        toggles={toggles}
        aspectRatio={mapDimensions.aspectRatio}
        titleText={titleText}
        footerText={footerText}
        footerTextSize={footerTextSize}
        layerDate={previewDate}
        logo={logo}
        logoPosition={logoPosition}
        logoScale={logoScale}
        titleHeight={titleHeight}
        legendPosition={legendPosition}
        legendScale={legendScale}
        initialViewState={{
          longitude: selectedMap.getCenter().lng,
          latitude: selectedMap.getCenter().lat,
          zoom: selectedMap.getZoom(),
        }}
        mapStyle={selectedMapStyle}
        maxBounds={selectedMap.getMaxBounds() ?? undefined}
        invertedAdminBoundaryLimitPolygon={invertedAdminBoundaryLimitPolygon}
        printRef={printRef}
        titleRef={titleRef}
        footerRef={footerRef}
        footerHeight={footerHeight}
        bottomLogo={bottomLogo}
        bottomLogoScale={bottomLogoScale}
        aaMarkers={AAMarkers}
        floodStations={filteredFloodStations}
        activePanel={activePanel}
        selectedLayers={printSelectedLayers}
        adminLevelLayersWithFillPattern={adminLevelLayersWithFillPattern}
        layersCoverage={layersCoverage}
        onBoundsChange={(bounds, zoom) => {
          setPreviewBounds(bounds);
          setPreviewZoom(zoom);
        }}
        onMapDimensionsChange={(width, height) => {
          setPreviewMapWidth(width);
          setPreviewMapHeight(height);
        }}
      />
    </div>
  );
}

export default PrintPreview;
