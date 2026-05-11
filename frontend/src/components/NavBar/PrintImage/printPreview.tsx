import { cloneDeep } from 'lodash';
import type { LngLatBounds } from 'maplibre-gl';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
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
import { getDisplayBoundaryLayers } from 'config/utils';
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
      return [
        LayerDefinitions[selectedLayerId],
        ...getDisplayBoundaryLayers().reverse(),
      ];
    }
    return [];
  }, [selectedLayerId, printConfig?.toggles.batchMapsVisibility]);

  const adminLevelLayersWithFillPattern = useMemo(
    () =>
      printSelectedLayers.filter(
        layer =>
          layer.type === 'admin_level_data' &&
          (layer.fillPattern ||
            layer.legend.some(legend => legend.fillPattern)),
      ) as AdminLevelDataLayerProps[],
    [printSelectedLayers],
  );

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

  const printConfigRef = useRef(printConfig);
  printConfigRef.current = printConfig;

  const mapLabelsVisibility = printConfig?.toggles.mapLabelsVisibility ?? true;
  const mapPreviewCenter = selectedMap?.getCenter();
  const mapPreviewZoom = selectedMap?.getZoom() ?? 1;

  const processedMapStyle = useMemo(() => {
    if (!selectedMap) {
      return null;
    }
    const rawStyle = selectedMap.getStyle();
    if (!rawStyle) {
      return null;
    }
    const style = cloneDeep(rawStyle);
    if (printSelectedLayers.length > 0) {
      const isLayerToRemove = (layer: { id: string; type: string }) =>
        layer.type === 'raster' || layer.id.startsWith('layer-');

      const sourcesToRemove = new Set(
        style.layers
          .filter(isLayerToRemove)
          .map(layer => ('source' in layer ? (layer.source as string) : null))
          .filter(Boolean) as string[],
      );

      style.layers = style.layers.filter(layer => !isLayerToRemove(layer));
      sourcesToRemove.forEach(sourceId => {
        delete style.sources[sourceId];
      });
    }
    if (!mapLabelsVisibility) {
      style.layers = style.layers.filter(x => !x.id.includes('label'));
    }
    return style;
  }, [selectedMap, printSelectedLayers, mapLabelsVisibility]);

  const initialViewState = useMemo(
    () => ({
      longitude: mapPreviewCenter?.lng ?? 0,
      latitude: mapPreviewCenter?.lat ?? 0,
      zoom: mapPreviewZoom,
    }),
    [mapPreviewCenter?.lng, mapPreviewCenter?.lat, mapPreviewZoom],
  );

  const maxBounds = useMemo(
    () => selectedMap?.getMaxBounds() ?? undefined,
    [selectedMap],
  );

  const handlePreviewBoundsChange = useCallback(
    (bounds: LngLatBounds, zoom: number) => {
      printConfigRef.current?.setPreviewBounds(bounds);
      printConfigRef.current?.setPreviewZoom(zoom);
    },
    [],
  );

  const handleMapDimensionsChange = useCallback(
    (width: number, height: number) => {
      printConfigRef.current?.setPreviewMapWidth(width);
      printConfigRef.current?.setPreviewMapHeight(height);
    },
    [],
  );

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
  } = printConfig;

  // Determine active panel for AA markers
  const activePanel =
    tabValue === Panel.AnticipatoryActionDrought ||
    tabValue === Panel.AnticipatoryActionFlood
      ? tabValue
      : undefined;

  if (!open) {
    return null;
  }

  if (!processedMapStyle) {
    return null;
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
        initialViewState={initialViewState}
        mapStyle={processedMapStyle}
        maxBounds={maxBounds}
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
        onBoundsChange={handlePreviewBoundsChange}
        onMapDimensionsChange={handleMapDimensionsChange}
      />
    </div>
  );
}

export default PrintPreview;
