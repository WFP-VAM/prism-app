import { Typography, createStyles, makeStyles } from '@material-ui/core';
import maplibregl, { MapSourceDataEvent } from 'maplibre-gl';
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
  mapWidth,
  mapHeight = 100,
  titleText,
  footerText,
  footerTextSize,
  dateText,
  logo,
  logoPosition,
  logoScale,
  titleHeight = 0,
  legendPosition,
  legendScale,
  initialViewState,
  mapStyle: mapStyleProp,
  maxBounds,
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
  signalExportReady = false,
}: MapExportLayoutProps) {
  const classes = useStyles();
  const northArrowRef = useRef<HTMLImageElement>(null);
  const mapRef = React.useRef<MapRef>(null);

  // Track the first symbol layer ID for proper layer ordering
  // Layers should be inserted below symbols/labels to keep labels visible
  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
    'label_airport',
  );

  // Scale percent for AA markers based on map zoom
  const scalePercent = useAAMarkerScalePercent(mapRef.current?.getMap());

  const updateScaleBarAndNorthArrow = useCallback(() => {
    const elem = document.querySelector(
      '.maplibregl-ctrl-scale',
    ) as HTMLElement;

    // this takes into account the watermark
    const baseHeight = footerHeight || 20;

    if (elem) {
      // eslint-disable-next-line fp/no-mutating-assign
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

    // Track source loading to ensure all tiles are loaded before signaling ready
    // Only needed when signalExportReady is true or onMapLoad is provided
    const shouldTrackSources = signalExportReady || onMapLoad;

    if (shouldTrackSources && map) {
      const loadingSources = new Set<string>();
      let hasSignaledReady = false;
      let checkReadyTimeout: ReturnType<typeof setTimeout> | null = null;

      const signalReady = () => {
        if (hasSignaledReady) {
          return;
        }
        // eslint-disable-next-line fp/no-mutation
        hasSignaledReady = true;
        map.off('sourcedata', sourceDataHandler);
        // Set PRISM_READY for server-side rendering (Playwright)
        if (signalExportReady) {
          // eslint-disable-next-line fp/no-mutation
          (window as any).PRISM_READY = true;
        }

        // Call optional callback
        if (onMapLoad) {
          onMapLoad(e);
        }
      };

      // Check if all sources are loaded and signal ready after a brief stabilization period
      const checkAllSourcesLoaded = () => {
        if (checkReadyTimeout) {
          clearTimeout(checkReadyTimeout);
        }
        // Wait a brief moment after the last source finishes to ensure tiles are rendered
        // eslint-disable-next-line fp/no-mutation
        checkReadyTimeout = setTimeout(() => {
          if (loadingSources.size === 0 && !hasSignaledReady) {
            signalReady();
          }
        }, 500);
      };

      const sourceDataHandler = (event: MapSourceDataEvent) => {
        if (!event.sourceId?.startsWith('source-')) {
          return;
        }

        if (!event.isSourceLoaded) {
          loadingSources.add(event.sourceId);
        } else if (loadingSources.has(event.sourceId)) {
          loadingSources.delete(event.sourceId);
          checkAllSourcesLoaded();
        }
      };

      map.on('sourcedata', sourceDataHandler);

      // If there are no data layers, signal ready after initial render settles
      // Use a longer timeout to ensure any async layer additions have a chance to start
      setTimeout(() => {
        if (loadingSources.size === 0 && !hasSignaledReady) {
          // eslint-disable-next-line no-console
          console.log(
            '[MapExport] No sources detected after timeout, signaling ready',
          );
          signalReady();
        }
      }, 1000);
    } else if (onMapLoad) {
      // No map reference, fall back to immediate callback
      onMapLoad(e);
    }
  };

  return (
    <div className={classes.previewContainer}>
      <div
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            border: '1px solid black',
            boxSizing: 'border-box',
            height: `${mapHeight}%`,
            width: `${mapWidth}%`,
          }}
        >
          <div ref={printRef} className={classes.printContainer}>
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
                bottom: `${(footerHeight || 20) + 40}px`,
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
                  {titleText}
                </Typography>
              </div>
            )}
            {toggles.footerVisibility && (footerText || dateText) && (
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
                {dateText && (
                  <Typography style={{ fontSize: `${footerTextSize}px` }}>
                    {dateText}
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
                  justifyContent:
                    logoPosition % 2 === 0 ? 'flex-start' : 'flex-end',
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
                initialViewState={initialViewState}
                onLoad={handleMapLoad}
                mapStyle={processedMapStyle || mapStyle.toString()}
                maxBounds={maxBounds}
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
        </div>
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
      width: 'calc(100% - 16px)',
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
    },
  }),
);

export default MapExportLayout;
