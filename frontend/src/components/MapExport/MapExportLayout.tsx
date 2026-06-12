import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { getImageUrl, iconNorthArrow } from 'assets/images';
// Layer components - keep in sync with MapView/Map/index.tsx
import {
  AdminLevelDataLayer,
  AnticipatoryActionDroughtLayer,
  AnticipatoryActionStormLayer,
  BoundaryLayer,
  CompositeLayer,
  ImpactLayer,
  PointDataLayer,
  StaticRasterLayer,
  WMSLayer,
} from 'components/MapView/Layers';
import { addFillPatternImagesInMap } from 'components/MapView/Layers/AdminLevelDataLayer/utils';
import AnticipatoryActionFloodLayer from 'components/MapView/Layers/AnticipatoryActionFloodLayer';
import { FloodStationMarker } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/FloodStationMarker';
import { loadStormIcons } from 'components/MapView/Layers/AnticipatoryActionStormLayer/constants';
import GeojsonDataLayer from 'components/MapView/Layers/GeojsonDataLayer';
import { ensureSDFIconsLoaded } from 'components/MapView/Layers/icon-utils';
import LegendItemsList from 'components/MapView/Legends/LegendItemsList';
import { mapStyle } from 'components/MapView/Map/utils';
import { DiscriminateUnion, LayerType, Panel } from 'config/types';
import type { StyleSpecification } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import { lightGrey } from 'muiTheme';
import React, {
  ComponentType,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import MapGL, { MapRef, Marker } from 'react-map-gl/maplibre';
import {
  applyAdminAreaClipPath,
  isMapFullyLoaded,
  syncMapView,
} from 'utils/adminAreaMapClip';
import { formatCoverageText, getFormattedDate } from 'utils/date-utils';
import {
  getFirstBoundaryLayerMapId,
  getLayerBeforeId,
  layerUsesSymbolAnchorOnly,
  stackLayersForMapPaintOrder,
} from 'utils/map-layer-before-utils';
import {
  getLayerMapId,
  isLayerOnView,
  useAAMarkerScalePercent,
} from 'utils/map-utils';
import useResizeObserver from 'utils/useOnResizeObserver';

import { getAspectRatioDecimal } from './aspectRatioConstants';
import {
  isBasemapLabelLayer,
  removeBasemapLabelLayersFromMap,
  splitExportMapStyleForClipping,
} from './splitExportMapStyleForClipping';
import { transparentDataOverlayMapStyle } from './transparentDataOverlayMapStyle';
import { MapExportLayoutProps } from './types';

/**
 * MapExportLayout - Shared component for rendering map exports
 *
 * This component is used by both:
 * - PrintPreview (for the print dialog)
 * - ExportView (for the /export route with URL params)
 *
 * SYNC NOTE: The layer rendering logic (componentTypes mapping) must be kept
 * in sync with MapView/Map/index.tsx to ensure consistent layer rendering.
 * If you add a new layer type, update both files.
 */

// Layer component mapping - KEEP IN SYNC with MapView/Map/index.tsx
type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: {
    component: ComponentType<{
      layer: DiscriminateUnion<U, 'type', T>;
      mapRef?: MapRef;
    }>;
  };
};

const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: { component: BoundaryLayer },
  wms: { component: WMSLayer },
  admin_level_data: { component: AdminLevelDataLayer },
  impact: { component: ImpactLayer },
  point_data: { component: PointDataLayer },
  geojson_polygon: { component: GeojsonDataLayer },
  static_raster: { component: StaticRasterLayer },
  composite: { component: CompositeLayer },
  anticipatory_action_drought: {
    component: AnticipatoryActionDroughtLayer,
  },
  anticipatory_action_storm: {
    component: AnticipatoryActionStormLayer,
  },
  anticipatory_action_flood: {
    component: AnticipatoryActionFloodLayer,
  },
};

/** Playwright (/export, signalExportReady): min consecutive "fully loaded" samples before PRISM_READY. */
const MAP_EXPORT_STABLE_LOADED_TICKS = 1;
/** Poll when map idle is slow (ms). 0 uses the shortest practical interval (browser clamps ~4ms). */
const MAP_EXPORT_LOAD_POLL_MS = 0;

function MapExportLayout({
  toggles,
  aspectRatio,
  titleText,
  footerText,
  footerTextSize,
  layerDate,
  logo,
  logoPosition,
  logoScale,
  titleHeight = 0,
  legendPosition,
  legendScale,
  bounds,
  mapStyle: mapStyleProp,
  adminAreaClipPolygon,
  printRef,
  titleRef,
  footerRef,
  footerHeight,
  bottomLogo,
  bottomLogoScale = 1,
  aaMarkers = [],
  floodStations = [],
  activePanel,
  adminLevelLayersWithFillPattern = [],
  selectedLayers = [],
  onMapLoad,
  onBoundsChange,
  onMapDimensionsChange,
  signalExportReady = false,
  layersCoverage = [],
}: MapExportLayoutProps) {
  const classes = useStyles();
  const northArrowRef = useRef<HTMLImageElement>(null);
  const baseMapRef = React.useRef<MapRef>(null);
  const dataMapRef = React.useRef<MapRef>(null);
  const boundariesMapRef = React.useRef<MapRef>(null);
  const labelsMapRef = React.useRef<MapRef>(null);
  const dataLayersClipContainerRef = useRef<HTMLDivElement>(null);
  const [baseMapReadyVersion, setBaseMapReadyVersion] = useState(0);
  const [runtimeLabelsOverlayStyle, setRuntimeLabelsOverlayStyle] =
    useState<StyleSpecification | null>(null);

  // Track container dimensions to calculate proper map size
  const [containerRef, containerDimensions] =
    useResizeObserver<HTMLDivElement>(aspectRatio);

  // Track the first symbol layer ID for proper layer ordering
  // Layers should be inserted below symbols/labels to keep labels visible
  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
    'label_airport',
  );

  // Boundaries first, then other layers — shared with MapView via stackLayersForMapPaintOrder.
  const stackLayers = useMemo(
    () => stackLayersForMapPaintOrder(selectedLayers),
    [selectedLayers],
  );

  const shouldClipDataLayers = Boolean(
    toggles.countryMask && adminAreaClipPolygon,
  );

  const boundaryLayers = useMemo(
    () => stackLayers.filter(layer => layer.type === 'boundary'),
    [stackLayers],
  );

  const dataLayers = useMemo(
    () => stackLayers.filter(layer => layer.type !== 'boundary'),
    [stackLayers],
  );

  // Process map style to filter labels if needed
  const processedMapStyle = useMemo(() => {
    if (
      typeof mapStyleProp === 'object' &&
      mapStyleProp.layers &&
      !toggles.mapLabelsVisibility
    ) {
      return {
        ...mapStyleProp,
        layers: mapStyleProp.layers.filter(
          layer => !isBasemapLabelLayer(layer),
        ),
      };
    }
    return mapStyleProp;
  }, [mapStyleProp, toggles.mapLabelsVisibility]);

  useEffect(() => {
    setRuntimeLabelsOverlayStyle(null);
  }, [processedMapStyle, shouldClipDataLayers, toggles.mapLabelsVisibility]);

  const clippedExportStyles = useMemo(() => {
    if (!shouldClipDataLayers || typeof processedMapStyle !== 'object') {
      return null;
    }

    return splitExportMapStyleForClipping(
      processedMapStyle,
      toggles.mapLabelsVisibility,
    );
  }, [processedMapStyle, shouldClipDataLayers, toggles.mapLabelsVisibility]);

  const basemapMapStyle =
    clippedExportStyles?.basemapStyle ??
    processedMapStyle ??
    mapStyle.toString();
  const labelsOverlayStyle =
    runtimeLabelsOverlayStyle ?? clippedExportStyles?.labelsStyle;
  const shouldShowLabelsOverlay = Boolean(
    shouldClipDataLayers && labelsOverlayStyle,
  );
  const shouldShowBoundariesOverlay = Boolean(
    shouldClipDataLayers && boundaryLayers.length > 0,
  );

  const firstBoundaryLayerMapId = getFirstBoundaryLayerMapId(
    baseMapRef.current?.getMap(),
  );

  const getBasemapLayerBeforeId = useCallback(
    (index: number, aboveBoundaries: boolean = false) =>
      getLayerBeforeId(index, {
        aboveBoundaries,
        stackLayers: shouldClipDataLayers ? boundaryLayers : stackLayers,
        map: baseMapRef.current?.getMap(),
        firstSymbolId,
        firstBoundaryLayerMapId,
      }),
    [
      boundaryLayers,
      firstBoundaryLayerMapId,
      firstSymbolId,
      shouldClipDataLayers,
      stackLayers,
    ],
  );

  const getBoundaryOverlayBeforeId = useCallback(
    (index: number) => {
      if (index === 0) {
        return undefined;
      }

      const previousLayerId = boundaryLayers[index - 1].id;
      if (isLayerOnView(boundariesMapRef.current?.getMap(), previousLayerId)) {
        return getLayerMapId(previousLayerId);
      }

      return undefined;
    },
    [boundaryLayers],
  );

  const getDataLayerBeforeId = useCallback(
    (index: number, aboveBoundaries: boolean = false) => {
      if (!shouldClipDataLayers) {
        return getBasemapLayerBeforeId(index, aboveBoundaries);
      }

      if (aboveBoundaries) {
        return undefined;
      }

      if (index === 0) {
        return undefined;
      }

      const previousLayerId = dataLayers[index - 1].id;
      if (isLayerOnView(dataMapRef.current?.getMap(), previousLayerId)) {
        return getLayerMapId(previousLayerId);
      }

      return undefined;
    },
    [dataLayers, getBasemapLayerBeforeId, shouldClipDataLayers],
  );

  const areExportMapsLoaded = useCallback(() => {
    const baseMap = baseMapRef.current?.getMap();
    if (!baseMap || !isMapFullyLoaded(baseMap)) {
      return false;
    }

    if (shouldClipDataLayers) {
      const dataMap = dataMapRef.current?.getMap();
      if (!dataMap || !isMapFullyLoaded(dataMap)) {
        return false;
      }
    }

    if (shouldShowBoundariesOverlay) {
      const boundariesMap = boundariesMapRef.current?.getMap();
      if (!boundariesMap || !isMapFullyLoaded(boundariesMap)) {
        return false;
      }
    }

    if (shouldShowLabelsOverlay) {
      const labelsMap = labelsMapRef.current?.getMap();
      if (!labelsMap || !isMapFullyLoaded(labelsMap)) {
        return false;
      }
    }

    return true;
  }, [
    shouldClipDataLayers,
    shouldShowBoundariesOverlay,
    shouldShowLabelsOverlay,
  ]);

  // Scale percent for AA markers based on map zoom
  const scalePercent = useAAMarkerScalePercent(baseMapRef.current?.getMap());

  const { t } = useTranslation();

  // Process title text to replace {date} and {coverage} placeholders
  const processedTitleText = useMemo(() => {
    if (!titleText) {
      return titleText;
    }

    let result = titleText;

    // Replace {date} with formatted layer date
    if (layerDate && result.includes('{date}')) {
      result = result.replace(
        /\{date\}/g,
        getFormattedDate(layerDate, 'localeNumericUTC') ?? '',
      );
    }

    // Replace {coverage} with formatted coverage ranges (using localized numeric date)
    if (layersCoverage && result.includes('{date_coverage}')) {
      const coverageText =
        formatCoverageText(layersCoverage, t, 'localeNumericUTC') ?? '';
      result = result.replace(/\{date_coverage\}/g, coverageText);
    }

    return result;
  }, [titleText, layerDate, layersCoverage, t]);

  // Compute footer date text from layerDate
  const footerDateText = useMemo(() => {
    const pubDate = `${t('Publication date')}: ${getFormattedDate(Date.now(), 'localeNumericUTC', t('date_locale'))}`;
    if (layerDate) {
      return `${pubDate}. ${t('Layer selection date')}: ${getFormattedDate(layerDate, 'localeNumericUTC', t('date_locale'))}.`;
    }
    return `${pubDate}.`;
  }, [layerDate, t]);

  const footerCoverageText = useMemo(() => {
    const coverageText = formatCoverageText(layersCoverage, t);
    if (!coverageText) {
      return null;
    }
    return `${t('Data coverage')}: ${coverageText}`;
  }, [layersCoverage, t]);

  const updateScaleBarAndNorthArrow = useCallback(() => {
    const elem = document.querySelector(
      '.maplibregl-ctrl-scale',
    ) as HTMLElement;

    // this takes into account the watermark
    const baseHeight = (footerHeight || 12) + 8;

    if (elem) {
      Object.assign(elem.style, {
        position: 'absolute',
        right: '10px',
        bottom: `${baseHeight + 10}px`,
        margin: 0,
      });
    }

    if (northArrowRef.current) {
      northArrowRef.current.style.bottom = `${baseHeight + 40}px`;
    }
  }, [footerHeight]);

  useEffect(() => {
    updateScaleBarAndNorthArrow();
  }, [updateScaleBarAndNorthArrow]);

  const logoHeightMultipler = 32;
  const logoHeight = logoHeightMultipler * logoScale;
  // Title min height is based on the logo size but only if visible
  const titleMinHeight = toggles.logoVisibility ? logoHeight : 0;
  // Title max width is based on the logo width plus the padding, assume a image ratio of 4:1 (very long) or taller
  const titleMaxWidth = toggles.logoVisibility
    ? `calc(100% - ${logoHeight * 8}px)`
    : '100%';

  // Calculate fallback initial view state from bounds
  const effectiveInitialViewState = useMemo(() => {
    if (bounds) {
      return {
        longitude: (bounds.west + bounds.east) / 2,
        latitude: (bounds.south + bounds.north) / 2,
        zoom: 5,
      };
    }
    return { longitude: 0, latitude: 0, zoom: 2 };
  }, [bounds]);

  const loadDataLayerAssets = useCallback(
    (map: maplibregl.Map | undefined) => {
      if (!map) {
        return;
      }

      Promise.all(
        adminLevelLayersWithFillPattern.map(layer =>
          addFillPatternImagesInMap(layer, map),
        ),
      );
      loadStormIcons(map, false);
      ensureSDFIconsLoaded(map);
    },
    [adminLevelLayersWithFillPattern],
  );

  const fitMapToBounds = useCallback(
    (map: maplibregl.Map | undefined) => {
      if (!bounds || !map) {
        return;
      }

      map.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        {
          padding: 0,
          animate: false,
        },
      );
    },
    [bounds],
  );

  const syncOverlayMapsToBasemap = useCallback(() => {
    const baseMap = baseMapRef.current?.getMap();
    if (!baseMap) {
      return;
    }

    const dataMap = dataMapRef.current?.getMap();
    if (dataMap) {
      syncMapView(baseMap, dataMap);
    }

    const boundariesMap = boundariesMapRef.current?.getMap();
    if (boundariesMap) {
      syncMapView(baseMap, boundariesMap);
    }

    const labelsMap = labelsMapRef.current?.getMap();
    if (labelsMap) {
      syncMapView(baseMap, labelsMap);
    }
  }, []);

  const applyDataLayersClipPath = useCallback(() => {
    const container = dataLayersClipContainerRef.current;
    if (!shouldClipDataLayers || !adminAreaClipPolygon) {
      if (container) {
        container.style.clipPath = '';
      }
      return;
    }

    const map = dataMapRef.current?.getMap();
    if (!map || !container) {
      return;
    }

    applyAdminAreaClipPath(map, container, adminAreaClipPolygon);
  }, [adminAreaClipPolygon, shouldClipDataLayers]);

  const syncClippedExportView = useCallback(() => {
    syncOverlayMapsToBasemap();
    applyDataLayersClipPath();
  }, [applyDataLayersClipPath, syncOverlayMapsToBasemap]);

  const startExportReadyTracking = useCallback(
    (map: maplibregl.Map, onLoadEvent: unknown) => {
      let hasSignaledReady = false;
      let stableLoadedTicks = 0;
      let pollInterval: ReturnType<typeof setInterval> | undefined;

      const signalReady = () => {
        if (hasSignaledReady) {
          return;
        }

        hasSignaledReady = true;
        map.off('idle', idleHandler);
        if (pollInterval !== undefined) {
          clearInterval(pollInterval);
        }

        // eslint-disable-next-line no-console
        console.info('All tiles loaded, setting PRISM_READY to true');
        (window as any).PRISM_READY = true;
        onMapLoad?.(onLoadEvent);
      };

      const bumpStableLoaded = () => {
        if (hasSignaledReady) {
          return;
        }
        if (areExportMapsLoaded()) {
          stableLoadedTicks += 1;
          if (stableLoadedTicks >= MAP_EXPORT_STABLE_LOADED_TICKS) {
            signalReady();
          }
        } else {
          stableLoadedTicks = 0;
        }
      };

      const idleHandler = () => {
        bumpStableLoaded();
      };

      map.on('idle', idleHandler);
      pollInterval = setInterval(() => {
        bumpStableLoaded();
      }, MAP_EXPORT_LOAD_POLL_MS);

      setTimeout(() => {
        if (pollInterval !== undefined) {
          clearInterval(pollInterval);
        }
        if (!hasSignaledReady) {
          console.warn('Safety timeout reached, forcing PRISM_READY');
          signalReady();
        }
      }, 60_000);
    },
    [areExportMapsLoaded, onMapLoad],
  );

  const handleBaseMapLoad = (e: any) => {
    e.target.addControl(new maplibregl.ScaleControl({}), 'bottom-right');
    updateScaleBarAndNorthArrow();

    const map = baseMapRef.current?.getMap();
    if (map) {
      const { layers } = map.getStyle();
      const symbolLayer = layers?.find(layer => layer.type === 'symbol');
      if (symbolLayer) {
        setFirstSymbolId(symbolLayer.id);
      }
    }

    if (!shouldClipDataLayers) {
      loadDataLayerAssets(map);
    } else if (
      toggles.mapLabelsVisibility &&
      typeof processedMapStyle === 'string' &&
      map?.getStyle()
    ) {
      const { labelsStyle } = splitExportMapStyleForClipping(
        map.getStyle(),
        true,
      );
      removeBasemapLabelLayersFromMap(map);
      setRuntimeLabelsOverlayStyle(labelsStyle);
    }

    fitMapToBounds(map);
    syncClippedExportView();
    setBaseMapReadyVersion(version => version + 1);

    if (onBoundsChange && map) {
      let lastBoundsStr: string | null = null;
      let lastZoom: number | null = null;

      const reportBounds = () => {
        const mapBounds = map.getBounds();
        const zoom = map.getZoom();
        if (mapBounds) {
          const boundsStr = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
          if (boundsStr !== lastBoundsStr || zoom !== lastZoom) {
            lastBoundsStr = boundsStr;
            lastZoom = zoom;
            onBoundsChange(mapBounds, zoom);
          }
        }
        syncClippedExportView();
      };

      reportBounds();
      map.on('moveend', reportBounds);
    }

    const shouldTrackTileLoading = signalExportReady || onMapLoad;

    if (
      shouldTrackTileLoading &&
      map &&
      !signalExportReady &&
      onMapLoad &&
      !shouldClipDataLayers
    ) {
      onMapLoad(e);
      return;
    }

    if (shouldTrackTileLoading && map && signalExportReady) {
      startExportReadyTracking(map, e);
    } else if (onMapLoad && !shouldClipDataLayers) {
      onMapLoad(e);
    }
  };

  const handleDataMapLoad = (e: any) => {
    const map = dataMapRef.current?.getMap();
    loadDataLayerAssets(map);
    fitMapToBounds(map);
    syncClippedExportView();

    if (onMapLoad && !signalExportReady) {
      onMapLoad(e);
    }
  };

  const handleBoundariesMapLoad = () => {
    syncClippedExportView();
  };

  const handleLabelsMapLoad = () => {
    syncClippedExportView();
  };
  // Calculate map dimensions based on container size and aspect ratio
  const mapDimensions = useMemo(() => {
    const { width: containerWidth, height: containerHeight } =
      containerDimensions;

    if (containerWidth === 0 || containerHeight === 0) {
      return { width: 0, height: 0 };
    }

    // When aspect ratio is 'Auto', fill the container completely
    if (aspectRatio === 'Auto') {
      return {
        width: containerWidth,
        height: containerHeight,
      };
    }

    // For all other aspect ratios (preset, A4, Custom), use the resolver
    const targetRatio = getAspectRatioDecimal(
      aspectRatio,
      containerWidth,
      containerHeight,
    );

    // Try filling width first
    const widthConstrainedHeight = containerWidth / targetRatio;

    if (widthConstrainedHeight <= containerHeight) {
      // Fits when filling width
      return {
        width: containerWidth,
        height: widthConstrainedHeight,
      };
    }
    // Need to constrain by height instead
    return {
      width: containerHeight * targetRatio,
      height: containerHeight,
    };
  }, [aspectRatio, containerDimensions]);

  useEffect(() => {
    if (
      onMapDimensionsChange &&
      mapDimensions.width > 0 &&
      mapDimensions.height > 0
    ) {
      onMapDimensionsChange(mapDimensions.width, mapDimensions.height);
    }
  }, [mapDimensions, onMapDimensionsChange]);

  useEffect(() => {
    if (!shouldClipDataLayers) {
      applyDataLayersClipPath();
      return undefined;
    }

    const baseMap = baseMapRef.current?.getMap();
    if (!baseMap) {
      return undefined;
    }

    let rafId = 0;
    const syncOnMove = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncClippedExportView();
      });
    };

    syncClippedExportView();
    baseMap.on('move', syncOnMove);
    baseMap.on('moveend', syncClippedExportView);
    baseMap.on('resize', syncClippedExportView);
    baseMap.on('zoom', syncOnMove);

    return () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
      baseMap.off('move', syncOnMove);
      baseMap.off('moveend', syncClippedExportView);
      baseMap.off('resize', syncClippedExportView);
      baseMap.off('zoom', syncOnMove);
      applyDataLayersClipPath();
    };
  }, [
    applyDataLayersClipPath,
    baseMapReadyVersion,
    mapDimensions,
    shouldClipDataLayers,
    syncClippedExportView,
  ]);

  // The map content (title, legend, footer, map itself)
  const mapContent = (
    <div ref={printRef} className={`${classes.printContainer} layout-ltr`}>
      {toggles.bottomLogoVisibility && getImageUrl(bottomLogo) && (
        <img
          style={{
            position: 'absolute',
            zIndex: 3,
            height: `${32 * bottomLogoScale}px`,
            bottom: `${(footerHeight || 20) + 10}px`,
            left: '10px',
            maxWidth: '150px',
            objectFit: 'contain',
          }}
          src={getImageUrl(bottomLogo)}
          alt="bottomLogo"
        />
      )}
      <img
        ref={northArrowRef}
        style={{
          position: 'absolute',
          zIndex: 3,
          width: '50px',
          bottom: `${(footerHeight || 20) + 42}px`,
          right: '10px',
        }}
        src={iconNorthArrow}
        alt="northArrow"
      />
      {titleText && (
        <div
          ref={titleRef}
          className={classes.titleOverlay}
          style={{ minHeight: `${titleMinHeight}px` }}
        >
          {toggles.logoVisibility && getImageUrl(logo) && (
            <img
              style={{
                position: 'absolute',
                zIndex: 2,
                height: logoHeight,
                left: logoPosition % 2 === 0 ? '8px' : 'auto',
                right: logoPosition % 2 === 0 ? 'auto' : '8px',
                display: 'flex',
                justifyContent:
                  logoPosition % 2 === 0 ? 'flex-start' : 'flex-end',
              }}
              src={getImageUrl(logo)}
              alt="logo"
            />
          )}
          <Typography variant="h6" style={{ maxWidth: titleMaxWidth }}>
            {processedTitleText}
          </Typography>
        </div>
      )}
      {toggles.footerVisibility &&
        (footerText || footerDateText || footerCoverageText) && (
          <div
            ref={footerRef}
            className={`${classes.footerOverlay} print-footer-overlay`}
          >
            {footerText && (
              <Typography
                className="print-footer-disclaimer"
                style={{
                  fontSize: `${footerTextSize}px`,
                  whiteSpace: 'pre-line',
                }}
              >
                {footerText}
              </Typography>
            )}
            {footerDateText && (
              <Typography
                className="print-footer-meta"
                style={{ fontSize: `${footerTextSize}px` }}
              >
                {footerDateText} {footerCoverageText ? footerCoverageText : ''}
              </Typography>
            )}
          </div>
        )}
      {toggles.logoVisibility && !titleText && getImageUrl(logo) && (
        <img
          style={{
            position: 'absolute',
            zIndex: 2,
            top: titleHeight + 8,
            height: logoHeight,
            left: logoPosition % 2 === 0 ? '8px' : 'auto',
            right: logoPosition % 2 === 0 ? 'auto' : '8px',
            display: 'flex',
            justifyContent: logoPosition % 2 === 0 ? 'flex-start' : 'flex-end',
          }}
          src={getImageUrl(logo)}
          alt="logo"
        />
      )}
      {toggles.legendVisibility && (
        <div
          style={{
            position: 'absolute',
            zIndex: 2,
            // Position legend below title bar (use measured height or fallback)
            // When titleText exists but titleHeight hasn't been measured yet, use a minimum offset
            top:
              (titleText ? Math.max(titleHeight, 48) : titleHeight) +
              (!titleText && logoPosition === legendPosition
                ? logoHeight + 4
                : 0),
            left: legendPosition % 2 === 0 ? '8px' : 'auto',
            right: legendPosition % 2 === 0 ? 'auto' : '8px',
            display: 'flex',
            justifyContent:
              legendPosition % 2 === 0 ? 'flex-start' : 'flex-end',
            width: '20px',
            // Use transform scale to adjust size based on legendScale
            transform: `scale(${legendScale})`,
          }}
        >
          <LegendItemsList
            forPrinting
            listStyle={classes.legendListStyle}
            showDescription={toggles.fullLayerDescription}
            overrideLayers={
              selectedLayers && selectedLayers.length > 0
                ? selectedLayers
                : undefined
            }
          />
        </div>
      )}
      <div className={classes.mapContainer}>
        <MapGL
          ref={baseMapRef}
          dragRotate={false}
          preserveDrawingBuffer
          initialViewState={effectiveInitialViewState}
          onLoad={handleBaseMapLoad}
          mapStyle={basemapMapStyle}
          style={{ width: '100%', height: '100%' }}
        >
          {!shouldClipDataLayers &&
            stackLayers.map((layer, index) => {
              const { component } = componentTypes[layer.type];
              return createElement(component as any, {
                key: layer.id,
                layer,
                mapRef: baseMapRef,
                before: getBasemapLayerBeforeId(
                  index,
                  layerUsesSymbolAnchorOnly(layer),
                ),
              });
            })}
          {!shouldClipDataLayers && (
            <>
              {activePanel === Panel.AnticipatoryActionDrought &&
                aaMarkers.map(marker => (
                  <Marker
                    key={`marker-${marker.district}`}
                    longitude={marker.longitude}
                    latitude={marker.latitude}
                    anchor="center"
                  >
                    <div style={{ transform: `scale(${scalePercent})` }}>
                      {marker.icon}
                    </div>
                  </Marker>
                ))}
              {activePanel === Panel.AnticipatoryActionFlood &&
                floodStations.map(station => (
                  <FloodStationMarker
                    key={`flood-station-${station.station_id}`}
                    station={station}
                    stationSummary={station}
                    interactive={false}
                  />
                ))}
            </>
          )}
        </MapGL>
        {shouldClipDataLayers && (
          <div
            ref={dataLayersClipContainerRef}
            className={classes.dataLayersClipOverlay}
          >
            <MapGL
              ref={dataMapRef}
              dragPan={false}
              scrollZoom={false}
              doubleClickZoom={false}
              touchZoomRotate={false}
              dragRotate={false}
              preserveDrawingBuffer
              initialViewState={effectiveInitialViewState}
              onLoad={handleDataMapLoad}
              mapStyle={transparentDataOverlayMapStyle}
              style={{ width: '100%', height: '100%' }}
            >
              {dataLayers.map((layer, index) => {
                const { component } = componentTypes[layer.type];
                return createElement(component as any, {
                  key: layer.id,
                  layer,
                  mapRef: dataMapRef,
                  before: getDataLayerBeforeId(
                    index,
                    layerUsesSymbolAnchorOnly(layer),
                  ),
                });
              })}
              {activePanel === Panel.AnticipatoryActionDrought &&
                aaMarkers.map(marker => (
                  <Marker
                    key={`marker-${marker.district}`}
                    longitude={marker.longitude}
                    latitude={marker.latitude}
                    anchor="center"
                  >
                    <div style={{ transform: `scale(${scalePercent})` }}>
                      {marker.icon}
                    </div>
                  </Marker>
                ))}
              {activePanel === Panel.AnticipatoryActionFlood &&
                floodStations.map(station => (
                  <FloodStationMarker
                    key={`flood-station-${station.station_id}`}
                    station={station}
                    stationSummary={station}
                    interactive={false}
                  />
                ))}
            </MapGL>
          </div>
        )}
        {shouldShowBoundariesOverlay && (
          <div className={classes.boundariesMapOverlay}>
            <MapGL
              ref={boundariesMapRef}
              dragPan={false}
              scrollZoom={false}
              doubleClickZoom={false}
              touchZoomRotate={false}
              dragRotate={false}
              preserveDrawingBuffer
              initialViewState={effectiveInitialViewState}
              onLoad={handleBoundariesMapLoad}
              mapStyle={transparentDataOverlayMapStyle}
              style={{ width: '100%', height: '100%' }}
            >
              {boundaryLayers.map((layer, index) => {
                const { component } = componentTypes[layer.type];
                return createElement(component as any, {
                  key: layer.id,
                  layer,
                  mapRef: boundariesMapRef,
                  before: getBoundaryOverlayBeforeId(index),
                });
              })}
            </MapGL>
          </div>
        )}
        {shouldShowLabelsOverlay && labelsOverlayStyle && (
          <div className={classes.labelsMapOverlay}>
            <MapGL
              ref={labelsMapRef}
              dragPan={false}
              scrollZoom={false}
              doubleClickZoom={false}
              touchZoomRotate={false}
              dragRotate={false}
              preserveDrawingBuffer
              initialViewState={effectiveInitialViewState}
              onLoad={handleLabelsMapLoad}
              mapStyle={labelsOverlayStyle}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={classes.previewContainer}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {mapDimensions.width > 0 && mapDimensions.height > 0 && (
          <div
            style={{
              position: 'relative',
              zIndex: 3,
              border: signalExportReady ? 'none' : '1px solid #9E9E9E',
              boxSizing: 'border-box',
              width: `${mapDimensions.width}px`,
              height: `${mapDimensions.height}px`,
            }}
          >
            {mapContent}
          </div>
        )}
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    printContainer: {
      width: '100%',
      height: '100%',
    },
    mapContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      zIndex: 1,
    },
    dataLayersClipOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      zIndex: 2,
      pointerEvents: 'none',
    },
    labelsMapOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      zIndex: 4,
      pointerEvents: 'none',
    },
    boundariesMapOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      zIndex: 3,
      pointerEvents: 'none',
    },
    titleOverlay: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
      color: 'black',
      backgroundColor: 'white',
      width: '100%',
      textAlign: 'center',
      fontSize: '1.25rem',
      fontWeight: 600,
      padding: '8px 0 8px 0',
      borderBottom: `1px solid ${lightGrey}`,
      '& h6': {},
    },
    footerOverlay: {
      padding: '8px',
      position: 'absolute',
      bottom: 0,
      left: 0,
      zIndex: 3,
      color: 'black',
      backgroundColor: 'white',
      width: '100%',
      boxSizing: 'border-box',
      borderTop: `1px solid ${lightGrey}`,
    },
    legendListStyle: {
      position: 'absolute',
      top: '8px',
      zIndex: 2,
    },
    sameRowToggles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    previewContainer: {
      height: '100%',
      width: '100%',
      minWidth: 0,
      minHeight: 0,
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
    },
  }),
);

export default MapExportLayout;
