import React, { useCallback, useEffect, useState } from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { Feature, Point } from 'geojson';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from 'context/anticipatoryAction/AAStormStateSlice';
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/types';
import { getAAColor } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionStormPanel/utils';
import AAStormDatePopup from './AAStormDatePopup';
import AAStormLandfallPopup from './AAStormLandfallPopup';
import moderateStorm from '../../../../../public/images/anticipatory-action-storm/moderate-tropical-storm.png';
import overland from '../../../../../public/images/anticipatory-action-storm/overland.png';
import severeTropicalStorm from '../../../../../public/images/anticipatory-action-storm/severe-tropical-storm.png';
import tropicalCyclone from '../../../../../public/images/anticipatory-action-storm/tropical-cyclone.png';
import intenseTropicalCyclone from '../../../../../public/images/anticipatory-action-storm/intense-tropical-cyclone.png';
import veryIntensiveCyclone from '../../../../../public/images/anticipatory-action-storm/very-intensive-tropical-cyclone.png';
import { TimeSeries } from './types';

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
}

// Use admin level 2 boundary layer
const boundaryLayer = getBoundaryLayersByAdminLevel(2);

const AnticipatoryActionStormLayer = React.memo(
  ({ layer }: AnticipatoryActionStormLayerProps) => {
    useDefaultDate(layer.id);
    const map = useSelector(mapSelector);
    const { viewType, selectedDate } = useSelector(AAFiltersSelector);
    const AAStormData = useSelector(AADataSelector);
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

    // Replace all AAStormData references with stormData
    const timeSeries: any =
      AAStormData && AAStormData.timeSeries
        ? enhanceTimeSeries(AAStormData.timeSeries as unknown as TimeSeries)
        : null;

    function getIconNameByWindType(windType: string) {
      if (windType === 'intense tropical cyclone') {
        return 'intense-tropical-cyclone';
      }

      if (windType === 'inland') {
        return 'overland';
      }

      return windType.split(' ').join('-');
    }

    function landfallPopupCloseHandler() {
      setSelectedFeature(null);
    }

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

      loadImage(moderateStorm, 'moderate-tropical-storm');
      loadImage(severeTropicalStorm, 'severe-tropical-storm');
      loadImage(tropicalCyclone, 'tropical-cyclone');
      loadImage(intenseTropicalCyclone, 'intense-tropical-cyclone');
      loadImage(overland, 'overland');
      loadImage(veryIntensiveCyclone, 'very-intensive-tropical-cyclone');
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

    const dispatch = useDispatch();

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
            if (
              AAStormData.activeDistricts?.Moderate?.districtNames.includes(
                districtName,
              )
            ) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  fillColor: getAAColor(AACategory.Moderate, 'Active', true)
                    .background,
                  fillOpacity: 0.4,
                },
              };
            }
            if (
              AAStormData.activeDistricts?.Severe?.districtNames.includes(
                districtName,
              )
            ) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  fillColor: getAAColor(AACategory.Severe, 'Active', true)
                    .background,
                  fillOpacity: 0.4,
                },
              };
            }
            return null;
          })
          .filter(f => f !== null),
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boundaryData]);

    if (!AAStormData) {
      return null;
    }

    return (
      <>
        {/* Add the colored districts layer */}
        {coloredDistrictsLayer && (
          <Source
            key="storm-districts"
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
          </Source>
        )}

        {/* 48kt wind forecast area - orange */}
        {viewType === 'forecast' && (
          <Source
            data={AAStormData.activeDistricts?.Moderate?.polygon}
            type="geojson"
          >
            <Layer
              id="exposed-area-48kt"
              beforeId="aa-storm-wind-points-layer"
              type="fill"
              paint={{
                'fill-opacity': 0.5,
                'fill-color': getAAColor(AACategory.Moderate, 'Active', true)
                  .background,
              }}
            />
          </Source>
        )}

        {/* 64kt wind forecast area - red */}
        {viewType === 'forecast' && (
          <Source
            data={AAStormData.activeDistricts?.Severe?.polygon}
            type="geojson"
          >
            <Layer
              id="exposed-area-64kt"
              beforeId="aa-storm-wind-points-layer"
              type="fill"
              paint={{
                'fill-opacity': 0.5,
                'fill-color': getAAColor(AACategory.Severe, 'Active', true)
                  .background,
              }}
            />
          </Source>
        )}
        {/* Storm Risk Map view */}
        {viewType === 'risk' && (
          <Source
            data={AAStormData.activeDistricts?.Risk?.polygon}
            type="geojson"
          >
            <Layer
              id="storm-risk-map"
              beforeId="aa-storm-wind-points-layer"
              type="fill"
              paint={{
                'fill-opacity': 0.5,
                'fill-color': '#9acddc',
              }}
            />
          </Source>
        )}

        {/* Common elements for both views */}
        <Source data={timeSeries} type="geojson">
          <Layer
            id="aa-storm-wind-points-layer"
            type="symbol"
            layout={{ 'icon-image': ['image', ['get', 'iconName']] }}
          />

          {/* past wind track - solid black line */}
          <Layer
            id="aa-storm-wind-points-line-past"
            type="line"
            filter={['==', ['get', 'data_type'], 'analysis']}
            paint={{
              'line-color': 'black',
              'line-width': 2,
            }}
          />

          {/* forecasted wind track - dashed red line */}
          <Layer
            id="aa-storm-wind-points-line-future"
            type="line"
            filter={['==', ['get', 'data_type'], 'forecast']}
            paint={{
              'line-color': 'red',
              'line-width': 2,
              'line-dasharray': [2, 1],
            }}
          />
        </Source>

        <AAStormDatePopup />

        {selectedFeature && AAStormData.landfall && selectedDate && (
          <AAStormLandfallPopup
            point={selectedFeature.geometry}
            reportDate={selectedFeature.properties?.time}
            landfallInfo={AAStormData.landfall}
            onClose={() => landfallPopupCloseHandler()}
            timelineDate={selectedDate}
          />
        )}
      </>
    );
  },
);

export default AnticipatoryActionStormLayer;
