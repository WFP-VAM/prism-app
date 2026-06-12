import { Typography } from '@mui/material';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
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
import { formatCoverageText, getFormattedDate } from 'utils/date-utils';
import {
  getFirstBoundaryLayerMapId,
  getLayerBeforeId,
  layerUsesSymbolAnchorOnly,
  stackLayersForMapPaintOrder,
} from 'utils/map-layer-before-utils';
import { useAAMarkerScalePercent } from 'utils/map-utils';
import useResizeObserver from 'utils/useOnResizeObserver';

import { getAspectRatioDecimal } from './aspectRatioConstants';
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
const MAP_EXPORT_STABLE_LOADED_TICKS = 2;

function scheduleAfterNextPaint(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}
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
  invertedAdminBoundaryLimitPolygon,
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
  const mapRef = React.useRef<MapRef>(null);

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

  const firstBoundaryLayerMapId = getFirstBoundaryLayerMapId(
    mapRef.current?.getMap(),
  );

  const getBeforeId = useCallback(
    (index: number, aboveBoundaries: boolean = false) =>
      getLayerBeforeId(index, {
        aboveBoundaries,
        stackLayers,
        map: mapRef.current?.getMap(),
        firstSymbolId,
        firstBoundaryLayerMapId,
      }),
    [firstBoundaryLayerMapId, firstSymbolId, stackLayers],
  );

  // Scale percent for AA markers based on map zoom
  const scalePercent = useAAMarkerScalePercent(mapRef.current?.getMap());

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

  // Process map style to filter labels if needed
  const processedMapStyle = useMemo(() => {
    if (
      typeof mapStyleProp === 'object' &&
      mapStyleProp.layers &&
      !toggles.mapLabelsVisibility
    ) {
      return {
        ...mapStyleProp,
        layers: mapStyleProp.layers.filter((x: any) => !x.id.includes('label')),
      };
    }
    return mapStyleProp;
  }, [mapStyleProp, toggles.mapLabelsVisibility]);

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

  const handleMapLoad = (e: any) => {
    e.target.addControl(new maplibregl.ScaleControl({}), 'bottom-right');
    updateScaleBarAndNorthArrow();

    // Find the first symbol layer for proper layer ordering
    // Data layers should be inserted below symbols/labels
    const map = mapRef.current?.getMap();
    if (map) {
      const { layers } = map.getStyle();
      const symbolLayer = layers?.find(layer => layer.type === 'symbol');
      if (symbolLayer) {
        setFirstSymbolId(symbolLayer.id);
      }
    }

    // Load fill pattern images to this new map instance if needed.
    Promise.all(
      adminLevelLayersWithFillPattern.map(layer =>
        addFillPatternImagesInMap(layer, mapRef.current?.getMap()),
      ),
    );

    // Load storm icons for anticipatory action storm layers
    loadStormIcons(mapRef.current?.getMap(), false); // Don't throw on error for print preview

    // Load SDF icons for point data layers
    ensureSDFIconsLoaded(mapRef.current?.getMap());

    // If bounds are provided, fit the map to those bounds.
    // This ensures precise geographic extent matching (e.g., for exports).
    if (bounds && map) {
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
    }

    // Capture preview bounds/zoom (must run before print-preview early return below).
    // Use moveend (fires after fitBounds and user pan/zoom) rather than idle
    // (which waits for all tiles to load and may not fire before export is captured).
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

      // Capture immediately (fitBounds with animate:false is synchronous)
      reportBounds();
      map.on('moveend', reportBounds);
    }

    // Track tile loading using idle event and areTilesLoaded() for robust detection
    const shouldTrackTileLoading = signalExportReady || onMapLoad;

    // Print preview passes onMapLoad only; /export uses signalExportReady + tile wait.
    if (shouldTrackTileLoading && map && !signalExportReady && onMapLoad) {
      onMapLoad(e);
      return;
    }

    if (shouldTrackTileLoading && map && signalExportReady) {
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
            onMapLoad(e);
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

      const checkFullyLoaded = (): boolean => {
        // areTilesLoaded() can return void
        const areTilesLoaded = Boolean(map.areTilesLoaded());
        const isStyleLoaded = map.isStyleLoaded();
        const isLoaded = map.loaded();

        return Boolean(isStyleLoaded && areTilesLoaded && isLoaded);
      };

      const bumpStableLoaded = () => {
        if (hasSignaledReady) {
          return;
        }
        if (checkFullyLoaded()) {
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
          ref={mapRef}
          dragRotate={false}
          // preserveDrawingBuffer is required for the map to be exported as an image
          preserveDrawingBuffer
          initialViewState={effectiveInitialViewState}
          onLoad={handleMapLoad}
          mapStyle={processedMapStyle || mapStyle.toString()}
        >
          {/* Render selected layers - KEEP IN SYNC with MapView/Map/index.tsx */}
          {/* Pass 'before' prop to insert layers below labels/symbols */}
          {stackLayers.map((layer, index) => {
            const { component } = componentTypes[layer.type];
            return createElement(component as any, {
              key: layer.id,
              layer,
              before: getBeforeId(index, layerUsesSymbolAnchorOnly(layer)),
            });
          })}
          {/* AA Drought markers */}
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
          {/* AA Flood station markers */}
          {activePanel === Panel.AnticipatoryActionFlood &&
            floodStations.map(station => (
              <FloodStationMarker
                key={`flood-station-${station.station_id}`}
                station={station}
                stationSummary={station}
                interactive={false}
              />
            ))}
          {toggles.countryMask && invertedAdminBoundaryLimitPolygon && (
            <Source
              id="mask-overlay"
              type="geojson"
              data={invertedAdminBoundaryLimitPolygon}
            >
              <Layer
                id="mask-layer-overlay"
                type="fill"
                source="mask-overlay"
                layout={{}}
                paint={{
                  'fill-color': '#000',
                  'fill-opacity': 0.7,
                }}
              />
            </Source>
          )}
        </MapGL>
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
    backdrop: {
      position: 'absolute',
    },
    backdropWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
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
