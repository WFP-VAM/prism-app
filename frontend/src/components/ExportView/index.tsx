import { createTheme, ThemeProvider } from '@material-ui/core';
import MapExportLayout from 'components/MapExport/MapExportLayout';
import { mapStyle } from 'components/MapView/Map/utils';
import { appConfig, safeCountry } from 'config';
import { SelectedDateTimestamp } from 'config/types';
import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
} from 'config/utils';
import {
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
  WMSLayerDatesRequested,
} from 'context/serverPreloadStateSlice';
import muiTheme from 'muiTheme';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import {
  boundaryCache,
  getCachedBoundaryLayerData,
} from 'utils/boundary-cache';
import { getExportFontStack, loadExportFonts } from 'utils/exportFontFamily';
import { exportLanguage } from 'utils/exportLanguage';
import useLayers from 'utils/layers-utils';
import { getLayersCoverage } from 'utils/server-utils';
import { useAdminAreaClipPolygon } from 'utils/useAdminAreaClipPolygon';
import { useBoundaryData } from 'utils/useBoundaryData';
import { useExportParams } from 'utils/useExportParams';
import { useMapState } from 'utils/useMapState';
import useResizeObserver from 'utils/useOnResizeObserver';
import { usePreloadBoundaryLayersForClip } from 'utils/usePreloadBoundaryLayersForClip';

/**
 * ExportView is a component that displays a map and allows the user to export it as a PDF or ZIP file.
 *
 * It is basically a simplified version of MapView that does not display the left panel and other features.
 * It reads configuration from URL parameters and renders the map export layout.
 */

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/

const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const ExportView = memo(() => {
  const { search } = useLocation();
  const { i18n } = useTranslation();
  const exportLang = exportLanguage(search, { apply: true });
  const [exportFontsReady, setExportFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setExportFontsReady(false);
    void loadExportFonts(exportLang).then(() => {
      if (!cancelled) {
        setExportFontsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [exportLang]);

  const exportFontStack = getExportFontStack(exportLang);
  const exportTheme = useMemo(
    () =>
      createTheme(muiTheme, {
        typography: {
          fontFamily: exportFontStack,
          h4: { fontFamily: exportFontStack },
          h5: { fontFamily: exportFontStack },
          h6: { fontFamily: exportFontStack },
          body1: { fontFamily: exportFontStack },
          body2: { fontFamily: exportFontStack },
        },
      }),
    [exportFontStack],
  );
  const exportParams = useExportParams();
  const printRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [titleHeight, setTitleHeight] = useState(0);
  const [measuredFooterHeight, setMeasuredFooterHeight] = useState(0);

  const onTitleResize = useCallback(
    (entry: ResizeObserverEntry) => setTitleHeight(entry.contentRect.height),
    [],
  );
  useResizeObserver(titleRef, onTitleResize);
  const onFooterResize = useCallback(
    (entry: ResizeObserverEntry) =>
      setMeasuredFooterHeight(entry.contentRect.height),
    [],
  );
  useResizeObserver(footerRef, onFooterResize);

  // Selectors
  const { actions, maplibreMap } = useMapState();
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dispatch = useDispatch();

  // Load layers from URL params - useLayers already handles this
  const { selectedLayers, selectedLayersWithDateSupport } = useLayers();

  // Get boundary layer for admin area clip
  const boundaryLayer = getBoundaryLayerSingleton();
  const { data: boundaryData } = useBoundaryData(boundaryLayer.id, map);

  const boundaryLayersVersion = usePreloadBoundaryLayersForClip({
    enabled: exportParams.toggles.countryMask,
    dispatch,
    map,
  });

  const adminAreaClipPolygon = useAdminAreaClipPolygon({
    enabled: exportParams.toggles.countryMask,
    country: safeCountry,
    selectedBoundaries: exportParams.selectedBoundaries,
    boundaryData,
    boundaryLayer,
    i18nLocale: i18n,
    getLayerData: getCachedBoundaryLayerData,
    boundaryLayersVersion,
  });

  // Preload dates and load boundary layers
  useEffect(() => {
    if (!datesPreloadingForPointData) {
      dispatch(preloadLayerDatesArraysForPointData());
    }
    if (!datesPreloadingForWMS) {
      dispatch(preloadLayerDatesArraysForWMS());
    }
    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => actions.addLayer(l));
    // Load boundary data into global cache (shared across all maps)
    boundaryCache.preloadBoundaries(displayedBoundaryLayers, dispatch, map);
  }, [
    dispatch,
    datesPreloadingForWMS,
    datesPreloadingForPointData,
    map,
    actions,
  ]);

  // Use default map style - MapExportLayout handles label filtering
  const processedMapStyle = mapStyle.toString();

  const { logo } = appConfig.header || {};
  const bottomLogo = appConfig?.printConfig?.bottomLogo;

  const adminLevelLayersWithFillPattern = useMemo(
    () =>
      selectedLayers.filter(
        layer =>
          layer.type === 'admin_level_data' &&
          (layer.fillPattern ||
            layer.legend.some(legend => legend.fillPattern)),
      ),
    [selectedLayers],
  );

  const layersCoverage = useMemo(() => {
    if (!exportParams.date) {
      return [];
    }

    const dateTimestamp = new Date(
      `${exportParams.date}T12:00:00Z`,
    ).getTime() as SelectedDateTimestamp;

    return getLayersCoverage(
      selectedLayersWithDateSupport.filter(
        layer =>
          layer.id !== 'anticipatory_action_flood' &&
          layer.id !== 'anticipatory_action_storm',
      ),
      dateTimestamp,
    );
  }, [exportParams.date, selectedLayersWithDateSupport]);

  // Use measured footer height, or estimate if not yet measured
  // Footer always shows date text when visible, so just check footerVisibility
  const footerHeight =
    measuredFooterHeight || (exportParams.toggles.footerVisibility ? 60 : 0);

  if (i18n.resolvedLanguage !== exportLang || !exportFontsReady) {
    return null;
  }

  return (
    <ThemeProvider theme={exportTheme}>
      {/* Paint order: MapExportLayout stacks boundaries before rasters */}
      <MapExportLayout
        toggles={exportParams.toggles}
        aspectRatio={exportParams.aspectRatio}
        titleText={exportParams.titleText}
        footerText={exportParams.footerText}
        footerTextSize={exportParams.footerTextSize}
        layerDate={exportParams.date}
        logo={logo}
        logoPosition={exportParams.logoPosition}
        logoScale={exportParams.logoScale}
        titleHeight={titleHeight}
        legendPosition={exportParams.legendPosition}
        legendScale={exportParams.legendScale}
        bounds={exportParams.bounds ?? undefined}
        mapStyle={processedMapStyle}
        adminAreaClipPolygon={adminAreaClipPolygon}
        printRef={printRef}
        titleRef={titleRef}
        footerRef={footerRef}
        footerHeight={footerHeight}
        bottomLogo={bottomLogo}
        bottomLogoScale={exportParams.bottomLogoScale}
        adminLevelLayersWithFillPattern={adminLevelLayersWithFillPattern}
        selectedLayers={selectedLayers}
        layersCoverage={layersCoverage}
        signalExportReady
      />
    </ThemeProvider>
  );
});

export default ExportView;
