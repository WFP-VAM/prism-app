import React, { useCallback, useEffect, useState } from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { Feature, Point } from 'geojson';
import { useDispatch, useSelector } from 'react-redux';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useMapCallback } from 'utils/map-utils';
import { hidePopup } from 'context/tooltipStateSlice';
import AAStormDatePopup from './AAStormDatePopup';
import AAStormData from '../../../../../public/data/mozambique/anticipatory-action/aa_storm_temporary.json';
import AAStormLandfallPopup from './AAStormLandfallPopup';
import moderateStorm from '../../../../../public/images/anticipatory-action-storm/moderate-tropical-storm.png';
import overland from '../../../../../public/images/anticipatory-action-storm/overland.png';
import severeTropicalStorm from '../../../../../public/images/anticipatory-action-storm/severe-tropical-storm.png';
import tropicalCyclone from '../../../../../public/images/anticipatory-action-storm/tropical-cyclone.png';
import veryIntensiveCyclone from '../../../../../public/images/anticipatory-action-storm/very-intensive-tropical-cyclone.png';
import { TimeSeries } from './types';
import { AAFiltersSelector } from 'context/anticipatoryActionStateSlice';

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
}

const AnticipatoryActionStormLayer = React.memo(
  ({ layer }: AnticipatoryActionStormLayerProps) => {
    useDefaultDate(layer.id);
    const map = useSelector(mapSelector);
    const { viewType } = useSelector(AAFiltersSelector);

    const [selectedFeature, setSelectedFeature] =
      useState<Feature<Point> | null>(null);

    /* this is the date the layer data corresponds to. It will be stored in redux ultimately */
    // const layerDataDate = '2024-03-11';

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

    const timeSeries: any = enhanceTimeSeries(
      AAStormData.time_series as unknown as TimeSeries,
    );

    function getIconNameByWindType(windType: string) {
      if (windType === 'intense tropical cyclone') {
        return 'tropical-cyclone';
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

    return (
      <>
        {/* 48kt wind forecast area - orange */}
        {viewType === 'forecast' && (
          <Source
            data={AAStormData.ready_set_results.exposed_area_48kt.polygon}
            type="geojson"
          >
            <Layer
              id="exposed-area-48kt"
              beforeId="aa-storm-wind-points-layer"
              type="fill"
              paint={{ 'fill-opacity': 0.5, 'fill-color': '#ff8934' }}
            />
          </Source>
        )}

        {/* 64kt wind forecast area - red */}
        {viewType === 'forecast' && (
          <Source
            data={AAStormData.ready_set_results.exposed_area_64kt.polygon}
            type="geojson"
          >
            <Layer
              id="exposed-area-64kt"
              beforeId="aa-storm-wind-points-layer"
              type="fill"
              paint={{ 'fill-opacity': 0.5, 'fill-color': '#e63701' }}
            />
          </Source>
        )}
        {/* Storm Risk Map view */}
        {viewType === 'risk' && (
          <Source
            data={AAStormData.ready_set_results.proba_48kt_20_5d.polygon}
            type="geojson"
          >
            <Layer
              id="storm-risk-map"
              beforeId="aa-storm-wind-points-layer"
              type="fill"
              paint={{ 'fill-opacity': 0.5, 'fill-color': '#9acddc' }}
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

        {selectedFeature && (
          <AAStormLandfallPopup
            point={selectedFeature.geometry}
            reportDate={selectedFeature.properties?.time}
            landfallInfo={AAStormData.landfall_info}
            onClose={() => landfallPopupCloseHandler()}
          />
        )}
      </>
    );
  },
);

export default AnticipatoryActionStormLayer;