import React, { useCallback, useEffect, useState } from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { Feature, Point } from 'geojson';
import { useDispatch, useSelector } from 'react-redux';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { useMapCallback } from 'utils/map-utils';
import { hidePopup } from 'context/tooltipStateSlice';
import { LayerData } from 'context/layers/layer-data';
import { getBoundaryLayersByAdminLevel } from 'config/utils';
import {
  AADataSelector,
  AAFiltersSelector,
  AALoadingSelector,
  loadStormReport,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/types';
import { updateDateRange } from 'context/mapStateSlice';
import { useWindStatesByTime } from 'components/MapView/DateSelector/TimelineItems/hooks';
import { getAAColor } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionStormPanel/utils';
import AAStormDatePopup from './AAStormDatePopup';
import AAStormLandfallPopup from './AAStormLandfallPopup';
import moderateStorm from '../../../../../public/images/anticipatory-action-storm/moderate-tropical-storm.png';
import inland from '../../../../../public/images/anticipatory-action-storm/inland.png';
import lowPressure from '../../../../../public/images/anticipatory-action-storm/low-pressure.png';
import tropicalDepression from '../../../../../public/images/anticipatory-action-storm/tropical-depression.png';
import severeTropicalStorm from '../../../../../public/images/anticipatory-action-storm/severe-tropical-storm.png';
import tropicalCyclone from '../../../../../public/images/anticipatory-action-storm/tropical-cyclone.png';
import intenseTropicalCyclone from '../../../../../public/images/anticipatory-action-storm/intense-tropical-cyclone.png';
import veryIntensiveCyclone from '../../../../../public/images/anticipatory-action-storm/very-intensive-tropical-cyclone.png';
import dissipating from '../../../../../public/images/anticipatory-action-storm/dissipating.png';
import defaultIcon from '../../../../../public/images/anticipatory-action-storm/default.png';
import { TimeSeries } from './types';

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
}

// Use admin level 2 boundary layer
const boundaryLayer = getBoundaryLayersByAdminLevel(2);

// Add this mapping object at the top of the file with other imports
const WIND_TYPE_TO_ICON_MAP: Record<string, string> = {
  disturbance: defaultIcon,
  'tropical-disturbance': defaultIcon,
  low: lowPressure,
  'tropical-depression': tropicalDepression,
  'moderate-tropical-storm': moderateStorm,
  'severe-tropical-storm': severeTropicalStorm,
  'tropical-cyclone': tropicalCyclone,
  'intense-tropical-cyclone': intenseTropicalCyclone,
  'very-intensive-tropical-cyclone': veryIntensiveCyclone,
  inland,
  dissipating,
  default: defaultIcon,
};

const AnticipatoryActionStormLayer = React.memo(
  ({ layer }: AnticipatoryActionStormLayerProps) => {
    // Load the layer default date if no date is selected
    useDefaultDate(layer.id);
    const map = useSelector(mapSelector);
    const { startDate } = useSelector(dateRangeSelector);
    const selectedDate = useDefaultDate('anticipatory-action-storm');
    const { viewType, selectedDateTime } = useSelector(AAFiltersSelector);

    const stormData = useSelector(AADataSelector);
    const loading = useSelector(AALoadingSelector);
    const windStates = useWindStatesByTime(selectedDate || 0);
    const latestWindState = windStates.states[windStates.states.length - 1];
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
          stormData.forecastDetails?.reference_time?.split('T')[0] !==
            latestWindState.ref_time?.split('T')[0])
      ) {
        dispatch(
          loadStormReport({
            date: latestWindState?.ref_time,
            stormName: windStates.cycloneName || 'chido',
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
      windStates.cycloneName,
      selectedDate,
      startDate,
    ]);

    const boundaryLayerState = useSelector(
      layerDataSelector(boundaryLayer.id),
    ) as LayerData<BoundaryLayerProps> | undefined;
    const { data: boundaryData } = boundaryLayerState || {};

    const [selectedFeature, setSelectedFeature] =
      useState<Feature<Point> | null>(null);

    function enhanceTimeSeries(timeSeries: TimeSeries) {
      const { features, ...timeSeriesRest } = timeSeries;

      // Create coordinates arrays for past and future lines based on data_type
      const pastLineCoordinates = features
        .filter(feature => feature.properties.data_type === 'analysis')
        .map(feature => (feature.geometry as Point).coordinates);

      const futureLineCoordinates = features
        .filter(feature => feature.properties.data_type === 'forecast')
        .map(feature => (feature.geometry as Point).coordinates);

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

    function getIconNameByWindType(windType: string) {
      const iconName = windType.split(' ').join('-').toLowerCase();
      if (!WIND_TYPE_TO_ICON_MAP[iconName]) {
        console.warn(`Unknown wind type: ${windType}, using default icon`);
        return 'default';
      }
      return iconName;
    }

    function landfallPopupCloseHandler() {
      setSelectedFeature(null);
    }

    // Load all images from the mapping
    const loadImages = useCallback(() => {
      const loadImage = (url: string, name: string) => {
        map?.loadImage(url, (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage(name)) {
            map.addImage(name, image!);
          }
        });
      };

      Object.entries(WIND_TYPE_TO_ICON_MAP).forEach(([name, url]) => {
        loadImage(url, name);
      });
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

    const onWindPointsClicked = () => (e: MapLayerMouseEvent) => {
      e.preventDefault();
      dispatch(hidePopup()); // hides the black tooltip containing the district names
      const feature = e.features?.[0];
      setSelectedFeature(feature as Feature<Point>);
    };

    useMapCallback<'click', null>(
      'click',
      'aa-storm-wind-points-layer',
      null,
      onWindPointsClicked,
    );

    const getDistrictColor = (districtName: string, StormData: any) => {
      // Check active districts
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
      if (
        StormData.activeDistricts?.Severe?.districtNames.includes(districtName)
      ) {
        return {
          color: getAAColor(AACategory.Severe, 'Active', true),
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
          opacity: 0.4,
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

    // Create a unique ID suffix based on the selected date
    const dateId = selectedDateTime ? `-${selectedDateTime}` : '';

    if (!boundaryData || !stormData) {
      return null;
    }

    return (
      <>
        {/* First render all fill layers */}
        {coloredDistrictsLayer && (
          <Source
            key={`storm-districts${dateId}`}
            id="storm-districts"
            type="geojson"
            data={coloredDistrictsLayer}
          >
            <Layer
              id="storm-districts-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': ['get', 'fillOpacity'],
              }}
            />
            <Layer
              id="storm-districts-border"
              type="line"
              paint={{
                'line-color': 'black',
                'line-width': 1,
              }}
            />
          </Source>
        )}

        {/* 48kt and 64kt wind forecast areas */}
        {viewType === 'forecast' && (
          <>
            {stormData.activeDistricts?.Moderate?.polygon && (
              <Source
                key={`exposed-area-48kt${dateId}`}
                type="geojson"
                data={stormData.activeDistricts?.Moderate?.polygon}
              >
                <Layer
                  id="exposed-area-48kt"
                  beforeId="aa-storm-wind-points-layer"
                  type="line"
                  paint={{
                    'line-color': getAAColor(
                      AACategory.Moderate,
                      'Active',
                      true,
                    ).background,
                    'line-width': 2,
                    'line-opacity': 0.8,
                  }}
                />
              </Source>
            )}
            {stormData.activeDistricts?.Severe?.polygon && (
              <Source
                key={`exposed-area-64kt${dateId}`}
                type="geojson"
                data={stormData.activeDistricts?.Severe?.polygon}
              >
                <Layer
                  id="exposed-area-64kt"
                  beforeId="aa-storm-wind-points-layer"
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
        )}

        {/* Storm Risk Map view */}
        {viewType === 'risk' && stormData.activeDistricts?.Risk?.polygon && (
          <Source
            key={`storm-risk-map${dateId}`}
            type="geojson"
            data={stormData.activeDistricts?.Risk?.polygon}
          >
            <Layer
              id="storm-risk-map"
              type="fill"
              beforeId="aa-storm-wind-points-layer"
              paint={{
                'fill-opacity': 0.5,
                'fill-color': '#9acddc',
              }}
            />
          </Source>
        )}

        {/* Render wind points last so they appear on top */}
        {timeSeries && (
          <Source data={timeSeries} type="geojson">
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
            <Layer
              id="aa-storm-wind-points-layer"
              type="symbol"
              layout={{ 'icon-image': ['image', ['get', 'iconName']] }}
            />
          </Source>
        )}

        <AAStormDatePopup />

        {selectedFeature && stormData.landfall?.time && (
          <AAStormLandfallPopup
            point={selectedFeature.geometry}
            reportDate={stormData.forecastDetails?.reference_time || ''}
            landfallInfo={stormData.landfall}
            onClose={() => landfallPopupCloseHandler()}
          />
        )}
      </>
    );
  },
);

export default AnticipatoryActionStormLayer;
