import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { getImageUrl, iconNorthArrow } from 'assets/images';
import { DeckGLLayersProvider } from 'components/MapView/DeckGLLayersContext';
import DeckGLOverlay from 'components/MapView/DeckGLOverlay';
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
import COGLayerComponent from 'components/MapView/Layers/COGLayer';
import GeojsonDataLayer from 'components/MapView/Layers/GeojsonDataLayer';
import { ensureSDFIconsLoaded } from 'components/MapView/Layers/icon-utils';
import LegendItemsList from 'components/MapView/Legends/LegendItemsList';
import { mapStyle } from 'components/MapView/Map/utils';
import { DiscriminateUnion, LayerType, Panel } from 'config/types';
import { addNotification } from 'context/notificationStateSlice';
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
import MapGL, { Layer, MapRef, Marker, Source } from 'react-map-gl/maplibre';
import { useDispatch } from 'react-redux';
import {
  isClipDebugEnabled,
  setClipErrorHandler,
} from 'utils/clipRasterProtocol';
import { formatCoverageText, getFormattedDate } from 'utils/date-utils';
import {
  getFirstBoundaryLayerMapId,
  getLayerBeforeId,
  layerUsesSymbolAnchorOnly,
  stackLayersForMapPaintOrder,
} from 'utils/map-layer-before-utils';
import { isBasemapLabelLayer, useAAMarkerScalePercent } from 'utils/map-utils';
import { scheduleAfterNextPaint } from 'utils/scheduleAfterNextPaint';
import useResizeObserver from 'utils/useOnResizeObserver';

import { getAspectRatioDecimal } from './aspectRatioConstants';
import { ClipProvider } from './ClipProvider';
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
 *
 * Country mask: when `toggles.countryMask` is on and an `adminAreaClipPolygon`
 * is provided, raster layers route tiles through the `clip://` protocol.
 * Vector data layers clip only when specific admin areas are selected;
 * full-region masks skip redundant vector clip. Raster layers always clip.
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
  cog: { component: COGLayerComponent },
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

function isMapFullyLoaded(map: maplibregl.Map): boolean {
  return Boolean(map.isStyleLoaded() && map.areTilesLoaded() && map.loaded());
}

/** Playwright (/export, signalExportReady): min consecutive "fully loaded" samples before PRISM_READY. */
const MAP_EXPORT_STABLE_LOADED_TICKS = 2;

/** Fallback poll when map idle is slow (ms). */
const MAP_EXPORT_LOAD_POLL_MS = 50;

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
  selectedBoundaries = [],
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
  onBaseMapReady,
  onMapLoad,
  onBoundsChange,
  onMapDimensionsChange,
  signalExportReady = false,
  layersCoverage = [],
}: MapExportLayoutProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const northArrowRef = useRef<HTMLImageElement>(null);
  const baseMapRef = React.useRef<MapRef>(null);

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

  const clipPolygon =
    toggles.countryMask && adminAreaClipPolygon ? adminAreaClipPolygon : null;

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

  const basemapMapStyle = processedMapStyle ?? mapStyle.toString();

  const firstBoundaryLayerMapId = getFirstBoundaryLayerMapId(
    baseMapRef.current?.getMap(),
  );

  const getBasemapLayerBeforeId = useCallback(
    (index: number, aboveBoundaries: boolean = false) =>
      getLayerBeforeId(index, {
        aboveBoundaries,
        stackLayers,
        map: baseMapRef.current?.getMap(),
        firstSymbolId,
        firstBoundaryLayerMapId,
      }),
    [firstBoundaryLayerMapId, firstSymbolId, stackLayers],
  );

  const areExportMapsLoaded = useCallback(() => {
    const baseMap = baseMapRef.current?.getMap();
    return Boolean(baseMap && isMapFullyLoaded(baseMap));
  }, []);

  // Scale percent for AA markers based on map zoom
  const scalePercent = useAAMarkerScalePercent(baseMapRef.current?.getMap());

  const { t } = useTranslation();

  // Surface clip:// tile fetch/CORS failures to the user as a notification.
  useEffect(() => {
    if (!clipPolygon) {
      return undefined;
    }
    setClipErrorHandler(error => {
      dispatch(
        addNotification({
          message: `Country mask could not load some map tiles: ${error.message}`,
          type: 'warning',
        }),
      );
    });
    return () => setClipErrorHandler(null);
  }, [clipPolygon, dispatch]);

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

        const finish = () => {
          if (signalExportReady) {
            // eslint-disable-next-line no-console
            console.info('All tiles loaded, setting PRISM_READY to true');
            (window as any).PRISM_READY = true;
          }
          if (onMapLoad) {
            onMapLoad(onLoadEvent);
          }
        };

        // Map idle + areTilesLoaded can run before the compositor paints (React 19 / concurrent
        // rendering). Playwright screenshot right after PRISM_READY then captured a partial frame.
        if (signalExportReady) {
          scheduleAfterNextPaint(finish);
        } else {
          finish();
        }
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
    [areExportMapsLoaded, onMapLoad, signalExportReady],
  );

  const handleBaseMapLoad = (e: any) => {
    e.target.addControl(new maplibregl.ScaleControl({}), 'bottom-right');
    updateScaleBarAndNorthArrow();

    const map = baseMapRef.current?.getMap();
    if (map) {
      onBaseMapReady?.(map);

      const { layers } = map.getStyle();
      const symbolLayer = layers?.find(layer => layer.type === 'symbol');
      if (symbolLayer) {
        setFirstSymbolId(symbolLayer.id);
      }
    }

    loadDataLayerAssets(map);
    fitMapToBounds(map);

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
      };

      reportBounds();
      map.on('moveend', reportBounds);
    }

    const shouldTrackTileLoading = signalExportReady || onMapLoad;

    if (shouldTrackTileLoading && map && signalExportReady) {
      startExportReadyTracking(map, e);
    } else if (onMapLoad) {
      onMapLoad(e);
    }
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
            transform: `scale(${legendScale})`,
            transformOrigin:
              legendPosition % 2 === 0 ? 'top left' : 'top right',
          }}
        >
          <LegendItemsList
            forPrinting
            listStyle={classes.legendListStyle}
            showDescription={toggles.fullLayerDescription}
            legendGraphicDpi={signalExportReady ? 192 : undefined}
            overrideLayers={
              selectedLayers && selectedLayers.length > 0
                ? selectedLayers
                : undefined
            }
          />
        </div>
      )}
      <div className={classes.mapContainer}>
        <DeckGLLayersProvider>
          <MapGL
            ref={baseMapRef}
            dragRotate={false}
            preserveDrawingBuffer
            initialViewState={effectiveInitialViewState}
            onLoad={handleBaseMapLoad}
            mapStyle={basemapMapStyle}
            style={{ width: '100%', height: '100%' }}
          >
            <DeckGLOverlay />
            <ClipProvider
              polygon={clipPolygon}
              clipAdminLevelData={selectedBoundaries.length > 0}
            >
              {clipPolygon && isClipDebugEnabled() && (
                <Source
                  id="clip-debug-outline"
                  type="geojson"
                  data={clipPolygon}
                >
                  <Layer
                    id="clip-debug-outline-line"
                    type="line"
                    paint={{ 'line-color': '#ff00ff', 'line-width': 2 }}
                  />
                </Source>
              )}
              {stackLayers.map((layer, index) => {
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
            </ClipProvider>
          </MapGL>
        </DeckGLLayersProvider>
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
