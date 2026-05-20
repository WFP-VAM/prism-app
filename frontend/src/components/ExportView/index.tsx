import '../../exportFonts.css';

import {
  Box,
  createStyles,
  createTheme,
  makeStyles,
  ThemeProvider,
} from '@material-ui/core';
import mask from '@turf/mask';
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
import { boundaryCache } from 'utils/boundary-cache';
import {
  getExportFontStack,
  getExportTextDirection,
} from 'utils/exportFontFamily';
import { exportLanguage } from 'utils/exportLanguage';
import useLayers from 'utils/layers-utils';
import { getLayersCoverage } from 'utils/server-utils';
import { useBoundaryData } from 'utils/useBoundaryData';
import { useExportParams } from 'utils/useExportParams';
import { useMapState } from 'utils/useMapState';
import useResizeObserver from 'utils/useOnResizeObserver';

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
  const classes = useStyles();
  const { search } = useLocation();
  const { i18n } = useTranslation();
  const exportLang = exportLanguage(search, { apply: true });
  const exportTheme = useMemo(
    () =>
      createTheme({
        ...muiTheme,
        typography: {
          ...muiTheme.typography,
          fontFamily: getExportFontStack(exportLang),
        },
      }),
    [exportLang],
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

  // Get boundary layer for mask computation
  const boundaryLayer = getBoundaryLayerSingleton();
  const { data: boundaryData } = useBoundaryData(boundaryLayer.id, map);

  // Compute inverted admin boundary polygon for mask
  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] =
    useState<GeoJSON.Feature | null>(null);

  useEffect(() => {
    if (!exportParams.toggles.countryMask) {
      setAdminBoundaryPolygon(null);
      return;
    }

    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    if (exportParams.selectedBoundaries.length === 0) {
      fetch(`/data/${safeCountry}/admin-boundary-unified-polygon.json`)
        .then(response => response.json())
        .then(polygonData => {
          const maskedPolygon = mask(polygonData as any);
          setAdminBoundaryPolygon(maskedPolygon as any);
        })
        .catch(error =>
          console.error('Error loading admin boundary polygon:', error),
        );
      return;
    }

    // Wait for boundary data to be loaded
    if (!boundaryData) {
      return;
    }

    // Filter features based on selected boundaries
    const filteredData = {
      ...boundaryData,
      features: boundaryData.features.filter((cell: any) => {
        const featureAdminCode = cell.properties?.[boundaryLayer.adminCode];
        return exportParams.selectedBoundaries.some(selectedCode =>
          String(featureAdminCode).startsWith(selectedCode),
        );
      }),
    };

    if (filteredData.features.length === 0) {
      // Fall back to full country mask if no features match
      fetch(`/data/${safeCountry}/admin-boundary-unified-polygon.json`)
        .then(response => response.json())
        .then(polygonData => {
          const maskedPolygon = mask(polygonData as any);
          setAdminBoundaryPolygon(maskedPolygon as any);
        })
        .catch(error =>
          console.error('Error loading admin boundary polygon:', error),
        );
      return;
    }

    const masked = mask(filteredData as any);
    setAdminBoundaryPolygon(masked as any);
  }, [
    boundaryData,
    exportParams.selectedBoundaries,
    exportParams.toggles.countryMask,
    boundaryLayer.adminCode,
  ]);

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

  if (i18n.resolvedLanguage !== exportLang) {
    return null;
  }

  return (
    <ThemeProvider theme={exportTheme}>
      <Box
        className={classes.root}
        style={{
          fontFamily: getExportFontStack(exportLang),
          direction: getExportTextDirection(exportLang),
        }}
      >
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
          invertedAdminBoundaryLimitPolygon={invertedAdminBoundaryLimitPolygon}
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
      </Box>
    </ThemeProvider>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: '100vh',
      width: '100%',
      position: 'relative',
    },
  }),
);

export default ExportView;
