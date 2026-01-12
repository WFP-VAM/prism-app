import { Typography, createStyles, makeStyles } from '@material-ui/core';
import maplibregl from 'maplibre-gl';
import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  createElement,
  ComponentType,
} from 'react';
import MapGL, { Layer, MapRef, Marker, Source } from 'react-map-gl/maplibre';
import { useTranslation } from 'react-i18next';
import useResizeObserver from 'utils/useOnResizeObserver';
import { getFormattedDate, formatCoverageText } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { lightGrey } from 'muiTheme';
import { FloodStationMarker } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/FloodStationMarker';
import LegendItemsList from 'components/MapView/Legends/LegendItemsList';
import { DiscriminateUnion, LayerType, Panel } from 'config/types';
import { addFillPatternImagesInMap } from 'components/MapView/Layers/AdminLevelDataLayer/utils';
import { mapStyle } from 'components/MapView/Map/utils';
import { loadStormIcons } from 'components/MapView/Layers/AnticipatoryActionStormLayer/constants';
import { ensureSDFIconsLoaded } from 'components/MapView/Layers/icon-utils';
import { useAAMarkerScalePercent } from 'utils/map-utils';
import iconNorthArrow from 'public/images/icon_north_arrow.png';
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
import GeojsonDataLayer from 'components/MapView/Layers/GeojsonDataLayer';
import AnticipatoryActionFloodLayer from 'components/MapView/Layers/AnticipatoryActionFloodLayer';
import { MapExportLayoutProps } from './types';
import { getAspectRatioDecimal } from './aspectRatioConstants';

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
  initialViewState,
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

    // Replace {coverage} with formatted coverage ranges (using DayFirstHyphenMonthName)
    if (layersCoverage && result.includes('{date_coverage}')) {
      const coverageText =
        formatCoverageText(
          layersCoverage,
          t,
          DateFormat.DayFirstHyphenMonthName,
        ) ?? '';
      result = result.replace(/\{date_coverage\}/g, coverageText);
    }

    return result;
  }, [titleText, layerDate, layersCoverage, t]);

  // Compute footer date text from layerDate
  const footerDateText = useMemo(() => {
    const pubDate = `${t('Publication date')}: ${getFormattedDate(Date.now(), 'localeNumericUTC')}`;
    if (layerDate) {
      return `${pubDate}. ${t('Layer selection date')}: ${getFormattedDate(layerDate, 'localeNumericUTC')}.`;
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

  // Calculate fallback initial view state from bounds if not provided
  const effectiveInitialViewState = useMemo(() => {
    if (initialViewState) {
      return initialViewState;
    }
    if (bounds) {
      return {
        longitude: (bounds.west + bounds.east) / 2,
        latitude: (bounds.south + bounds.north) / 2,
        zoom: 5,
      };
    }
    return { longitude: 0, latitude: 0, zoom: 2 };
  }, [initialViewState, bounds]);

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

    // If bounds are provided, fit the map to those bounds
    // This ensures precise geographic extent matching (e.g., for exports)
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

    // Track tile loading using idle event and areTilesLoaded() for robust detection
    const shouldTrackTileLoading = signalExportReady || onMapLoad;

    if (shouldTrackTileLoading && map) {
      let hasSignaledReady = false;
      let idleCheckCount = 0;
      const MAX_IDLE_CHECKS = 3;

      const signalReady = () => {
        if (hasSignaledReady) {
          return;
        }

        hasSignaledReady = true;
        map.off('idle', idleHandler);

        // Set PRISM_READY for server-side rendering (Playwright)
        if (signalExportReady) {
          // eslint-disable-next-line no-console
          console.info('All tiles loaded, setting PRISM_READY to true');
          (window as any).PRISM_READY = true;
        }

        if (onMapLoad) {
          onMapLoad(e);
        }
      };

      const checkFullyLoaded = (): boolean => {
        // areTilesLoaded() can return void
        const areTilesLoaded = Boolean(map.areTilesLoaded());
        const isStyleLoaded = map.isStyleLoaded();
        const isLoaded = map.loaded();

        return Boolean(isStyleLoaded && areTilesLoaded && isLoaded);
      };

      const idleHandler = () => {
        if (hasSignaledReady) {
          return;
        }

        if (checkFullyLoaded()) {
          idleCheckCount += 1;

          // Require multiple consecutive idle states to ensure stability
          if (idleCheckCount >= MAX_IDLE_CHECKS) {
            signalReady();
          }
        } else {
          // Reset counter if not fully loaded
          idleCheckCount = 0;
        }
      };

      // Listen for idle events - fires when map finishes rendering
      map.on('idle', idleHandler);

      // Poll for ready state
      const pollInterval = setInterval(() => {
        if (!hasSignaledReady && checkFullyLoaded()) {
          clearInterval(pollInterval);
          signalReady();
        }
      }, 500);

      // Safety timeout to prevent infinite waiting
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!hasSignaledReady) {
          console.warn('Safety timeout reached, forcing PRISM_READY');
          signalReady();
        }
      }, 25000);
    } else if (onMapLoad) {
      onMapLoad(e);
    }

    // Capture and report map bounds and zoom after load
    // Use 'idle' event to ensure map has fully settled
    // Only report when bounds actually change to avoid infinite re-render loops
    if (onBoundsChange && map) {
      let lastBoundsStr: string | null = null;
      let lastZoom: number | null = null;

      map.on('idle', () => {
        const mapBounds = map.getBounds();
        const zoom = map.getZoom();
        if (mapBounds) {
          // Only call onBoundsChange if bounds or zoom actually changed
          const boundsStr = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
          if (boundsStr !== lastBoundsStr || zoom !== lastZoom) {
            lastBoundsStr = boundsStr;
            lastZoom = zoom;
            onBoundsChange(mapBounds, zoom);
          }
        }
      });
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
    <div className={classes.printContainer}>
      {toggles.bottomLogoVisibility && bottomLogo && (
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
          src={bottomLogo}
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
          {toggles.logoVisibility && logo && (
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
              src={logo}
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
          <div ref={footerRef} className={classes.footerOverlay}>
            {footerText && (
              <Typography
                style={{
                  fontSize: `${footerTextSize}px`,
                  whiteSpace: 'pre-line',
                }}
              >
                {footerText}
              </Typography>
            )}
            {footerDateText && (
              <Typography style={{ fontSize: `${footerTextSize}px` }}>
                {footerDateText} {footerCoverageText ? footerCoverageText : ''}
              </Typography>
            )}
          </div>
        )}
      {toggles.logoVisibility && !titleText && logo && (
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
          src={logo}
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
          {selectedLayers.map(layer => {
            const { component } = componentTypes[layer.type];
            return createElement(component as any, {
              key: layer.id,
              layer,
              before: firstSymbolId,
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
            ref={printRef}
            style={{
              position: 'relative',
              zIndex: 3,
              border: '1px solid #9E9E9E',
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
