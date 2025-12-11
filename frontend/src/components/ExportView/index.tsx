import { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, createStyles, makeStyles } from '@material-ui/core';
import {
  getDisplayBoundaryLayers,
  getBoundaryLayerSingleton,
} from 'config/utils';
import {
  WMSLayerDatesRequested,
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
} from 'context/serverPreloadStateSlice';
import { useMapState } from 'utils/useMapState';
import { boundaryCache } from 'utils/boundary-cache';
import { useExportParams } from 'utils/useExportParams';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig, safeCountry } from 'config';
import { useBoundaryData } from 'utils/useBoundaryData';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { mapStyle } from 'components/MapView/Map/utils';
import mask from '@turf/mask';
import { useSafeTranslation } from 'i18n';
import MapExportLayout from 'components/MapExport/MapExportLayout';
import useLayers from 'utils/layers-utils';
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
// eslint-disable-next-line fp/no-mutating-methods
const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const ExportView = memo(() => {
  const classes = useStyles();
  const { t } = useSafeTranslation();
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
  const onMapLoad = useCallback(() => {
    // eslint-disable-next-line fp/no-mutation
    (window as any).PRISM_READY = true;
  }, []);
  useResizeObserver(footerRef, onFooterResize);

  // Selectors
  const { actions, maplibreMap } = useMapState();
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dateRange = useSelector(dateRangeSelector);
  const dispatch = useDispatch();

  // Load layers from URL params - useLayers already handles this
  const { selectedLayers } = useLayers();

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
  const initialViewState = useMemo(() => {
    if (exportParams.bounds) {
      const centerLng =
        (exportParams.bounds.west + exportParams.bounds.east) / 2;
      const centerLat =
        (exportParams.bounds.south + exportParams.bounds.north) / 2;
      return {
        longitude: centerLng,
        latitude: centerLat,
        zoom: exportParams.zoom ?? 5,
      };
    }
    const [west, south, east, north] = appConfig.map.boundingBox;
    return {
      longitude: (west + east) / 2,
      latitude: (south + north) / 2,
      zoom: exportParams.zoom ?? 5,
    };
  }, [exportParams.bounds, exportParams.zoom]);

  const dateText = useMemo(() => {
    const pubDate = `${t('Publication date')}: ${getFormattedDate(
      Date.now(),
      'default',
    )}`;
    if (dateRange.startDate) {
      return `${pubDate}. ${t('Layer selection date')}: ${getFormattedDate(
        dateRange.startDate,
        'default',
      )}.`;
    }
    return `${pubDate}.`;
  }, [dateRange.startDate, t]);

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

  // Use measured footer height, or estimate if not yet measured
  const footerHeight =
    measuredFooterHeight ||
    (exportParams.toggles.footerVisibility &&
    (exportParams.footerText || dateText)
      ? 60
      : 0);

  return (
    <Box className={classes.root}>
      <MapExportLayout
        toggles={exportParams.toggles}
        mapWidth={exportParams.mapWidth}
        mapHeight={exportParams.mapHeight}
        titleText={exportParams.titleText}
        footerText={exportParams.footerText}
        footerTextSize={exportParams.footerTextSize}
        dateText={dateText}
        logo={logo}
        logoPosition={exportParams.logoPosition}
        logoScale={exportParams.logoScale}
        titleHeight={titleHeight}
        legendPosition={exportParams.legendPosition}
        legendScale={exportParams.legendScale}
        initialViewState={initialViewState}
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
        onMapLoad={onMapLoad}
      />
    </Box>
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
