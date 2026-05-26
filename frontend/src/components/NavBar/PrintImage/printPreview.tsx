import { CircularProgress, Typography } from '@material-ui/core';
import { useFilteredFloodStations } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/useFilteredFloodStations';
import { appConfig } from 'config';
import {
  AdminLevelDataLayerProps,
  Panel,
  SelectedDateTimestamp,
} from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { getDisplayBoundaryLayers } from 'config/utils';
import { AAMarkersSelector } from 'context/anticipatoryAction/AADroughtStateSlice';
import { AAFloodDataSelector } from 'context/anticipatoryAction/AAFloodStateSlice';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import {
  availableDatesSelector,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';
import { cloneDeep } from 'lodash';
import type { LngLatBounds } from 'maplibre-gl';
import {
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useLayers from 'utils/layers-utils';
import { getLayersCoverage } from 'utils/server-utils';

import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import MapExportLayout from '../../MapExport/MapExportLayout';
import type { ExportMapBounds } from '../../MapExport/types';
import PrintConfigContext from './printConfig.context';

function lngLatBoundsToExport(b: LngLatBounds): ExportMapBounds {
  return {
    west: b.getWest(),
    south: b.getSouth(),
    east: b.getEast(),
    north: b.getNorth(),
  };
}

function PrintPreview() {
  const { printConfig } = useContext(PrintConfigContext);
  const dispatch = useDispatch();

  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const availableDates = useSelector(availableDatesSelector);
  const AAMarkers = useSelector(AAMarkersSelector);
  const floodState = useSelector(AAFloodDataSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const { t } = useSafeTranslation();

  const { logo } = appConfig.header || {};
  const { selectedLayersWithDateSupport } = useLayers();
  const selectedLayerId = printConfig?.selectedLayerId ?? null;
  // Style clone + MapExportLayout remount are expensive; defer so layer Select can
  // close and paint before cloneDeep runs (keeps preview correct once caught up).
  const deferredLayerIdForPreview = useDeferredValue(selectedLayerId);
  const previewLayerTransitionPending =
    selectedLayerId !== deferredLayerIdForPreview;

  useEffect(() => {
    if (selectedLayerId && !availableDates[selectedLayerId]) {
      dispatch(loadAvailableDatesForLayer(selectedLayerId));
    }
  }, [selectedLayerId, availableDates, dispatch]);

  const printSelectedLayers = useMemo(() => {
    if (
      printConfig?.toggles.batchMapsVisibility &&
      deferredLayerIdForPreview &&
      LayerDefinitions[deferredLayerIdForPreview]
    ) {
      return [
        LayerDefinitions[deferredLayerIdForPreview],
        ...getDisplayBoundaryLayers().reverse(),
      ];
    }
    return [];
  }, [deferredLayerIdForPreview, printConfig?.toggles.batchMapsVisibility]);

  const mapLabelsVisibility = printConfig?.toggles.mapLabelsVisibility ?? true;

  const maxBounds = useMemo(
    () => selectedMap?.getMaxBounds() ?? undefined,
    [selectedMap],
  );

  // MapLibre mutates `getStyle()` in place after load; React only sees stable
  // `selectedMap` ref → memoized clones go stale until something else changes deps.
  // Bump epoch on open + styledata while print dialog visible.
  const [mainMapStyleEpoch, setMainMapStyleEpoch] = useState(0);
  useEffect(() => {
    if (!selectedMap || !printConfig?.open) {
      return undefined;
    }
    const bumpEpoch = () => setMainMapStyleEpoch(n => n + 1);
    bumpEpoch();
    selectedMap.on('styledata', bumpEpoch);
    return () => {
      selectedMap.off('styledata', bumpEpoch);
    };
  }, [printConfig?.open, selectedMap]);

  // Clone the main map style for the preview MapGL instance. Never mutate
  // `getStyle()` in place — that object backs the live map.
  const processedMapStyle = useMemo(() => {
    if (!selectedMap) {
      return null;
    }
    // Snapshot current style from the main map (basemap + any GL layers).
    const rawStyle = selectedMap.getStyle();
    if (!rawStyle) {
      return null;
    }
    const style = cloneDeep(rawStyle);

    // When batch maps has a selected layer, strip application layers from this
    // snapshot (raster tiles and all `layer-` prefixed entries), leaving a pure
    // basemap. Boundary layers and the WMS/date layer are drawn by React children
    // (`MapExportLayout`) so order stays explicit and we avoid main-map side
    // effects (e.g. a layer with `boundary` that removes other boundary layers).
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
    // Respect the print dialog “map labels” toggle on this clone only.
    if (!mapLabelsVisibility) {
      style.layers = style.layers.filter(x => !x.id.includes('label'));
    }
    return style;
  }, [
    selectedMap,
    printSelectedLayers,
    mapLabelsVisibility,
    mainMapStyleEpoch,
  ]);

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

  const togglesSlice = printConfig?.toggles;
  const previewLoaderKey = useMemo(
    () =>
      [
        deferredLayerIdForPreview ?? '',
        String(previewDate ?? ''),
        togglesSlice?.batchMapsVisibility ? '1' : '0',
        togglesSlice?.mapLabelsVisibility ? '1' : '0',
      ].join('|'),
    [
      togglesSlice?.batchMapsVisibility,
      togglesSlice?.mapLabelsVisibility,
      previewDate,
      deferredLayerIdForPreview,
    ],
  );

  const [previewMapReady, setPreviewMapReady] = useState(false);

  useLayoutEffect(() => {
    setPreviewMapReady(false);
  }, [previewLoaderKey, printConfig?.open]);

  const handlePreviewMapLoad = useCallback(() => {
    setPreviewMapReady(true);
  }, []);

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
    previewBounds,
    setPreviewBounds,
    setPreviewZoom,
    setPreviewMapWidth,
    setPreviewMapHeight,
  } = printConfig;

  const boundsToFit = previewBounds ?? selectedMap.getBounds();
  const geographicBoundsForExport = lngLatBoundsToExport(boundsToFit);

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
    // Style not ready yet (e.g. map still booting) — avoid mounting MapGL with no style.
    return null;
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        position: 'relative',
      }}
    >
      {(!previewMapReady || previewLayerTransitionPending) && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={t('Loading preview map')}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            zIndex: 10,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="textSecondary">
            {t('Loading preview map')}
          </Typography>
        </div>
      )}
      <MapExportLayout
        key={previewLoaderKey}
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
        bounds={geographicBoundsForExport}
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
        onBoundsChange={(bounds, zoom) => {
          setPreviewBounds(bounds);
          setPreviewZoom(zoom);
        }}
        onMapDimensionsChange={(width, height) => {
          setPreviewMapWidth(width);
          setPreviewMapHeight(height);
        }}
        onMapLoad={handlePreviewMapLoad}
      />
    </div>
  );
}

export default PrintPreview;
