import {Typography} from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import maplibregl from 'maplibre-gl';
import React, { useContext, useRef } from 'react';
import MapGL, { Layer, MapRef, Marker, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig } from 'config';
import { lightGrey } from 'muiTheme';
import { AAMarkersSelector } from 'context/anticipatoryAction/AADroughtStateSlice';
import { AAFloodDataSelector } from 'context/anticipatoryAction/AAFloodStateSlice';
import { useAAMarkerScalePercent } from 'utils/map-utils';
import { useFilteredFloodStations } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/useFilteredFloodStations';
import { FloodStationMarker } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/FloodStationMarker';
import LegendItemsList from 'components/MapView/Legends/LegendItemsList';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { Panel, AdminLevelDataLayerProps } from 'config/types';
import useLayers from 'utils/layers-utils';
import { addFillPatternImagesInMap } from 'components/MapView/Layers/AdminLevelDataLayer/utils';
import { mapStyle } from 'components/MapView/Map/utils';
import { loadStormIcons } from 'components/MapView/Layers/AnticipatoryActionStormLayer/constants';
import { ensureSDFIconsLoaded } from 'components/MapView/Layers/icon-utils';
import iconNorthArrow from 'public/images/icon_north_arrow.png';

import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import PrintConfigContext from './printConfig.context';

function PrintPreview() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { printConfig } = useContext(PrintConfigContext);

  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const AAMarkers = useSelector(AAMarkersSelector);
  const floodState = useSelector(AAFloodDataSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const northArrowRef = useRef<HTMLImageElement>(null);

  const mapRef = React.useRef<MapRef>(null);

  const footerHeight = printConfig?.footerHeight;
  const updateScaleBarAndNorthArrow = React.useCallback(() => {
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

  React.useEffect(() => {
    updateScaleBarAndNorthArrow();
  }, [updateScaleBarAndNorthArrow]);

  const { logo } = appConfig.header || {};
  const scalePercent = useAAMarkerScalePercent(mapRef.current?.getMap());
  const { selectedLayers } = useLayers();
  const adminLevelLayersWithFillPattern = selectedLayers.filter(
    layer =>
      layer.type === 'admin_level_data' &&
      (layer.fillPattern || layer.legend.some(legend => legend.fillPattern)),
  ) as AdminLevelDataLayerProps[];

  const filteredFloodStations = useFilteredFloodStations(
    floodState.stationSummaryData,
    dateRange.startDate,
  );

  const dateText = `${t('Publication date')}: ${getFormattedDate(
    Date.now(),
    'default',
  )}${
    dateRange.startDate
      ? `. ${t('Layer selection date')}: ${getFormattedDate(
          dateRange.startDate,
          'default',
        )}`
      : ''
  }.`;

  // Appease TS by ensuring printConfig is defined
  if (!printConfig) {
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
  } = printConfig;

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap?.getStyle();

  if (selectedMapStyle && !toggles.mapLabelsVisibility) {
    // eslint-disable-next-line fp/no-mutation
    selectedMapStyle.layers = selectedMapStyle?.layers.filter(
      x => !x.id.includes('label'),
    );
  }

  const logoHeightMultipler = 32;
  const logoHeight = logoHeightMultipler * logoScale;
  // Title min height is based on the logo size but only if visible
  const titleMinHeight = toggles.logoVisibility ? logoHeight : 0;
  // Title max width is based on the logo width plus the padding, assume a image ratio of 4:1 (very long) or taller
  const titleMaxWidth = toggles.logoVisibility
    ? `calc(100% - ${logoHeight * 8}px)`
    : '100%';

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
            height: `${mapDimensions.height}%`,
            width: `${mapDimensions.width}%`,
          }}
        >
          <div ref={printRef} className={classes.printContainer}>
            <img
              ref={northArrowRef}
              style={{
                position: 'absolute',
                zIndex: 3,
                width: '50px',
                bottom: `${(footerHeight as number) + 40}px`,
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
                {toggles.logoVisibility && (
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
            {toggles.logoVisibility && !titleText && (
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
                  top:
                    titleHeight +
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
                  transform: `scale(${1 - legendScale})`,
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
              {selectedMap && open && (
                <MapGL
                  ref={mapRef}
                  dragRotate={false}
                  // preserveDrawingBuffer is required for the map to be exported as an image
                  preserveDrawingBuffer
                  initialViewState={{
                    longitude: selectedMap.getCenter().lng,
                    latitude: selectedMap.getCenter().lat,
                    zoom: selectedMap.getZoom(),
                  }}
                  onLoad={e => {
                    e.target.addControl(
                      new maplibregl.ScaleControl({}),
                      'bottom-right',
                    );
                    updateScaleBarAndNorthArrow();

                    // Load fill pattern images to this new map instance if needed.
                    Promise.all(
                      adminLevelLayersWithFillPattern.map(layer =>
                        addFillPatternImagesInMap(
                          layer as AdminLevelDataLayerProps,
                          mapRef.current?.getMap(),
                        ),
                      ),
                    );

                    // Load storm icons for anticipatory action storm layers
                    loadStormIcons(mapRef.current?.getMap(), false); // Don't throw on error for print preview

                    // Load SDF icons for point data layers
                    ensureSDFIconsLoaded(mapRef.current?.getMap());
                  }}
                  mapStyle={selectedMapStyle || mapStyle.toString()}
                  maxBounds={selectedMap.getMaxBounds() ?? undefined}
                >
                  {tabValue === Panel.AnticipatoryActionDrought &&
                    AAMarkers.map(marker => (
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
                  {tabValue === Panel.AnticipatoryActionFlood &&
                    filteredFloodStations.map(station => (
                      <FloodStationMarker
                        key={`flood-station-${station.station_id}`}
                        station={station}
                        stationSummary={station}
                        interactive={false}
                      />
                    ))}
                  {toggles.countryMask && (
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
              )}
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
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    },
  }),
);

export default PrintPreview;
