import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { Feature, Point } from 'geojson';
import { useDispatch, useSelector } from 'context/hooks';
import {
  dateRangeSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { useMapCallback } from 'utils/map-utils';
import { hidePopup } from 'context/tooltipStateSlice';
import { useBoundaryData } from 'utils/useBoundaryData';
import { getBoundaryLayersByAdminLevel } from 'config/utils';
import {
  AADataSelector,
  AALoadingSelector,
  loadStormReport,
  AASelectedStormNameSelector,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { updateDateRange } from 'context/mapStateSlice';
import { useWindStatesByTime } from 'components/MapView/DateSelector/TimelineItems/hooks';
import { getAAColor } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionStormPanel/utils';
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { AAStormTimeSeriesFeature, TimeSeries } from 'prism-common/';
import maplibregl from 'maplibre-gl';
import { WIND_TYPE_TO_ICON_MAP, loadStormIcons } from './constants';
import AAStormDatePopup from './AAStormDatePopup';
import AAStormLandfallPopup from './AAStormLandfallPopup';

import AAStormLandfallMarker from './AAStormLandfallPopup/AAStormLandfallMarker/AAStormLandfallMarker';
import { parseGeoJsonFeature } from './utils';
import { findLandfallWindPoint } from './AAStormLandfallPopup/utils';

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
}

// Use admin level 2 boundary layer
const boundaryLayer = getBoundaryLayersByAdminLevel(2);

const AnticipatoryActionStormLayer = React.memo(
  ({ layer }: AnticipatoryActionStormLayerProps) => {
    // Load the layer default date if no date is selected
    useDefaultDate(layer.id);
    const map = useSelector(mapSelector);
    const { startDate } = useSelector(dateRangeSelector);
    const selectedDate = useDefaultDate('anticipatory-action-storm');

    const stormData = useSelector(AADataSelector);
    const loading = useSelector(AALoadingSelector);
    const selectedStormName = useSelector(AASelectedStormNameSelector);
    const windStates = useWindStatesByTime(
      selectedDate || 0,
      selectedStormName,
    )[0];
    const latestWindState = windStates?.states[windStates.states.length - 1];
    const dispatch = useDispatch();

    // Load data when:
    // 1. No forecast details exist but we have a reference time, OR
    // 2. Forecast details exist but are from a different date than the latest wind state
    useEffect(() => {
      if (
        (!stormData.forecastDetails && latestWindState?.ref_time) ||
        (stormData.forecastDetails &&
          !loading &&
          latestWindState?.ref_time &&
          (stormData.forecastDetails?.reference_time?.split('T')[0] !==
            latestWindState.ref_time?.split('T')[0] ||
            stormData.forecastDetails?.cyclone_name.toLowerCase() !==
              windStates?.cycloneName?.toLowerCase()))
      ) {
        dispatch(
          loadStormReport({
            date: latestWindState?.ref_time,
            stormName: windStates?.cycloneName || 'chido',
          }),
        );
        // If no start date is selected, update the date range to the selected date
        // TODO - investigate a better way to handle this
        if (!startDate) {
          dispatch(updateDateRange({ startDate: selectedDate }));
        }
      }
    }, [
      dispatch,
      loading,
      stormData,
      latestWindState,
      selectedStormName,
      windStates?.cycloneName,
      selectedDate,
      startDate,
    ]);

    const { data: boundaryData } = useBoundaryData(boundaryLayer.id, map);

    const [selectedFeature, setSelectedFeature] = useState<{
      feature: AAStormTimeSeriesFeature | null;
      clickedOnMap: boolean;
      clickedOnWindPoint: boolean;
    }>({ feature: null, clickedOnMap: false, clickedOnWindPoint: false });

    function enhanceTimeSeries(timeSeries: TimeSeries) {
      const { features, ...timeSeriesRest } = timeSeries;

      // Create coordinates arrays for past and future lines based on data_type
      const pastLineCoordinates = features
        .filter(feature => feature.properties.data_type === 'analysis')
        .map(feature => (feature.geometry as Point).coordinates);

      const futureLineCoordinates = features
        .filter(feature => feature.properties.data_type === 'forecast')
        .map(feature => (feature.geometry as Point).coordinates);

      // Add the first point of the future line to the past line to ensure they connect
      if (futureLineCoordinates.length > 0 && pastLineCoordinates.length > 0) {
        // eslint-disable-next-line fp/no-mutating-methods
        pastLineCoordinates.push(futureLineCoordinates[0]);
      }

      const pastLineFeature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: pastLineCoordinates,
        },
        properties: { data_type: 'analysis' },
      } as Feature<any>;

      const futureLineFeature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: futureLineCoordinates,
        },
        properties: { data_type: 'forecast' },
      } as Feature<any>;

      // Create new features array with both lines and points
      const newFeatures = [
        pastLineFeature,
        futureLineFeature,
        // Then add all the point features with icons
        ...features.map(feature => ({
          ...feature,
          properties: {
            ...feature.properties,
            iconName: getIconNameByWindType(feature.properties.development),
          },
        })),
      ];

      return { ...timeSeriesRest, features: newFeatures };
    }

    const timeSeries: any =
      stormData && stormData.timeSeries
        ? enhanceTimeSeries(stormData.timeSeries as unknown as TimeSeries)
        : null;

    // Handle map fitting when timeSeries data is available but outside of the current view
    useEffect(() => {
      if (map && timeSeries?.features?.length) {
        // Get coordinates from forecast line only
        const allCoordinates = timeSeries.features
          .filter(
            (f: {
              geometry: { type: string };
              properties: { data_type: string };
            }) =>
              f.geometry.type === 'LineString' &&
              f.properties.data_type === 'forecast',
          )
          .flatMap(
            (f: { geometry: { coordinates: any } }) => f.geometry.coordinates,
          );

        if (allCoordinates.length) {
          // Get current map bounds
          const currentBounds = map.getBounds();

          // Add margin to the east (20% of the current view width)
          const viewWidth = currentBounds.getEast() - currentBounds.getWest();
          const easternMargin = viewWidth * 0.2;

          // Check if ANY part of the storm path intersects with current view (including eastern margin)
          const isAnyPointVisible = allCoordinates.some((coord: [any, any]) => {
            const [lng, lat] = coord;
            return (
              lng >= currentBounds.getWest() &&
              lng <= currentBounds.getEast() - easternMargin &&
              lat >= currentBounds.getSouth() &&
              lat <= currentBounds.getNorth()
            );
          });

          // Only adjust zoom if no part of the storm is visible
          if (!isAnyPointVisible) {
            // Calculate the bounds of the storm path
            const bounds = new maplibregl.LngLatBounds();
            allCoordinates.forEach((coord: number[]) => {
              // Ensure coord is a valid [lng, lat] array before extending
              if (
                Array.isArray(coord) &&
                coord.length === 2 &&
                !Number.isNaN(coord[0]) &&
                !Number.isNaN(coord[1])
              ) {
                bounds.extend([coord[0], coord[1]]);
              }
            });

            map.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 200 },
            });
          }
        }
      }
    }, [map, timeSeries]);

    function getIconNameByWindType(windType: string) {
      const iconName = windType.split(' ').join('-').toLowerCase();
      if (!WIND_TYPE_TO_ICON_MAP[iconName]) {
        console.warn(`Unknown wind type: ${windType}, using default icon`);
        return 'default';
      }
      return iconName;
    }

    function landfallPopupCloseHandler() {
      setSelectedFeature(currentState => ({
        ...currentState,
        clickedOnMap: true,
      }));
    }

    // Load all images from the mapping
    const loadImages = useCallback(() => {
      loadStormIcons(map, true); // Throw on error for main map
    }, [map]);

    useEffect(() => {
      loadImages();
    }, [loadImages]);

    // Display a pointer cursor when hovering over the wind points
    const onMouseEnter = () => () => {
      if (map) {
        // eslint-disable-next-line fp/no-mutation
        map.getCanvas().style.cursor = 'pointer';
      }
    };

    useMapCallback<'mouseenter', null>(
      'mouseenter',
      'aa-storm-wind-points-layer',
      null,
      onMouseEnter,
    );

    const onMouseLeave = () => () => {
      if (map) {
        // eslint-disable-next-line fp/no-mutation
        map.getCanvas().style.cursor = '';
      }
    };

    useMapCallback<'mouseleave', null>(
      'mouseleave',
      'aa-storm-wind-points-layer',
      null,
      onMouseLeave,
    );

    const { clickedOnMap, clickedOnWindPoint } = selectedFeature;
    /* This is a trick to handle event concurrency when clicking on map on the landfall windpoint.
     * That's what the 2 booleans (clickedOnMap and clickedOnWindPoint) are used for
     */
    useEffect(() => {
      if (clickedOnMap && clickedOnWindPoint) {
        setSelectedFeature({
          feature: null,
          clickedOnMap: false,
          clickedOnWindPoint: false,
        });
      }
    }, [clickedOnMap, clickedOnWindPoint]);

    const landfallWindPoint = useMemo(
      () => findLandfallWindPoint(stormData),
      [stormData],
    );
    const onWindPointsClicked = () => (e: MapLayerMouseEvent) => {
      e.preventDefault();
      dispatch(hidePopup()); // hides the black tooltip containing the district names

      const feature = e.features?.[0];

      if (landfallWindPoint?.properties.time === feature?.properties.time) {
        // clicked feature corresponds to the landfall feature
        setSelectedFeature(currentState => ({
          ...currentState,
          clickedOnWindPoint: true,
          feature: parseGeoJsonFeature(feature),
        }));
      }
    };

    useMapCallback<'click', null>(
      'click',
      'aa-storm-wind-points-layer',
      null,
      onWindPointsClicked,
    );

    const getDistrictColor = (districtName: string, StormData: any) => {
      if (
        ![
          ...(StormData.naDistricts?.Severe?.districtNames || []),
          ...(StormData.naDistricts?.Moderate?.districtNames || []),
          ...(StormData.activeDistricts?.Severe?.districtNames || []),
          ...(StormData.activeDistricts?.Moderate?.districtNames || []),
        ].includes(districtName)
      ) {
        return null;
      }

      if (
        StormData.readiness &&
        [
          ...(StormData.activeDistricts?.Severe?.districtNames || []),
          ...(StormData.activeDistricts?.Moderate?.districtNames || []),
        ].includes(districtName)
      ) {
        return {
          color: { background: '#63b2bd', text: 'white' },
          opacity: 0.8,
        };
      }
      // Check active districts
      if (
        StormData.activeDistricts?.Severe?.districtNames.includes(districtName)
      ) {
        return {
          color: getAAColor(AACategory.Severe, 'Active', true),
          opacity: 0.8,
        };
      }
      if (
        StormData.activeDistricts?.Moderate?.districtNames.includes(
          districtName,
        )
      ) {
        return {
          color: getAAColor(AACategory.Moderate, 'Active', true),
          opacity: 0.8,
        };
      }
      // Check NA districts
      const isNADistrict = [
        ...(StormData.naDistricts?.Severe?.districtNames || []),
        ...(StormData.naDistricts?.Moderate?.districtNames || []),
      ].includes(districtName);

      if (isNADistrict) {
        return {
          color: getAAColor(AACategory.Severe, 'na', true),
          opacity: 0.1,
        };
      }

      return null;
    };

    const coloredDistrictsLayer = React.useMemo(() => {
      if (!boundaryData) {
        return null;
      }

      return {
        ...boundaryData,
        features: boundaryData.features
          .map(feature => {
            const districtName =
              feature.properties?.[boundaryLayer.adminLevelLocalNames[1]];
            const colorInfo = getDistrictColor(districtName, stormData);

            if (!colorInfo) {
              return null;
            }

            return {
              ...feature,
              properties: {
                ...feature.properties,
                fillColor: colorInfo.color.background,
                fillOpacity: colorInfo.opacity,
              },
            };
          })
          .filter(Boolean),
      };
    }, [boundaryData, stormData]);

    if (!boundaryData || !stormData) {
      return null;
    }

    // Ensure the layer exists before assigning a beforeId for correct rendering order
    const getBeforeId = () => {
      if (stormData.uncertaintyCone) {
        return 'storm-risk-map';
      }
      if (timeSeries) {
        return 'aa-storm-wind-points-line-future';
      }

      return '';
    };

    // Create a report id based on the reference time of the report
    const reportId = stormData.forecastDetails?.reference_time || '';

    return (
      <>
        {/* Render wind points first so they are available as beforeId */}
        {timeSeries && (
          <Source data={timeSeries} type="geojson">
            <Layer
              id="aa-storm-wind-points-layer"
              type="symbol"
              layout={{ 'icon-image': ['image', ['get', 'iconName']] }}
            />
            <Layer
              id="aa-storm-wind-points-line-past"
              beforeId="aa-storm-wind-points-layer"
              type="line"
              filter={['==', ['get', 'data_type'], 'analysis']}
              paint={{
                'line-color': 'black',
                'line-width': 2,
              }}
            />
            <Layer
              id="aa-storm-wind-points-line-future"
              beforeId="aa-storm-wind-points-layer"
              type="line"
              filter={['==', ['get', 'data_type'], 'forecast']}
              paint={{
                'line-color': 'red',
                'line-width': 2,
                'line-dasharray': [2, 1],
              }}
            />
          </Source>
        )}

        {/* Render uncertainty cone */}
        {stormData.uncertaintyCone && (
          <Source
            key={`uncertainty-cone-map-${reportId}`}
            type="geojson"
            data={stormData.uncertaintyCone}
          >
            <Layer
              id="storm-risk-map"
              beforeId="aa-storm-wind-points-line-future"
              type="line"
              paint={{
                'line-opacity': 0.8,
                'line-color': '#2ecc71',
                'line-width': 2,
              }}
            />
          </Source>
        )}

        {/* Render fill layers */}
        {coloredDistrictsLayer && (
          <Source
            key={`storm-districts-${reportId}`}
            id="storm-districts"
            type="geojson"
            data={coloredDistrictsLayer}
          >
            <Layer
              id="storm-districts-fill"
              beforeId={getBeforeId()}
              type="fill"
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': ['get', 'fillOpacity'],
              }}
            />
            <Layer
              id="storm-districts-border"
              beforeId={getBeforeId()}
              type="line"
              paint={{
                'line-color': 'black',
                'line-width': 1,
              }}
            />
          </Source>
        )}

        {/* 48kt and 64kt wind forecast areas */}
        <>
          {stormData.activeDistricts?.Moderate?.polygon && (
            <Source
              key={`exposed-area-48kt-${reportId}`}
              type="geojson"
              data={stormData.activeDistricts?.Moderate?.polygon}
            >
              <Layer
                id="exposed-area-48kt"
                beforeId={getBeforeId()}
                type="line"
                paint={{
                  'line-color': getAAColor(AACategory.Moderate, 'Active', true)
                    .background,
                  'line-width': 2,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}
          {stormData.activeDistricts?.Severe?.polygon && (
            <Source
              key={`exposed-area-64kt-${reportId}`}
              type="geojson"
              data={stormData.activeDistricts?.Severe?.polygon}
            >
              <Layer
                id="exposed-area-64kt"
                beforeId={getBeforeId()}
                type="line"
                paint={{
                  'line-color': getAAColor(AACategory.Severe, 'Active', true)
                    .background,
                  'line-width': 2,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}
        </>

        <AAStormDatePopup timeSeries={stormData.timeSeries} />

        {selectedFeature.feature && (
          <AAStormLandfallPopup
            feature={selectedFeature.feature}
            reportDate={stormData.forecastDetails?.reference_time || ''}
            landfallInfo={stormData.landfall}
            onClose={() => landfallPopupCloseHandler()}
          />
        )}

        <AAStormLandfallMarker stormData={stormData} />
      </>
    );
  },
);

export default AnticipatoryActionStormLayer;
