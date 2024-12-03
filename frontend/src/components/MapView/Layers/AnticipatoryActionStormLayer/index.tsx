import React, { useEffect } from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapRef } from 'react-map-gl/maplibre';
import AAStormPopup, { TimeSeries } from './AAStormPopup';
import AAStormData from '../../../../../public/data/mozambique/anticipatory-action/aa_storm_temporary.json';

const AnticipatoryActionStormLayer = React.memo(
  ({ layer, mapRef }: AnticipatoryActionStormLayerProps) => {
    useDefaultDate(layer.id);

    const timeSeries: TimeSeries =
      AAStormData.time_series as unknown as TimeSeries;

    function filterTimeSerieByWindType(windTypes: string[]) {
      return timeSeries.features.filter(timePoint =>
        windTypes.includes(timePoint.properties.development),
      );
    }

    function loadImages() {
      const map = mapRef.getMap();
      // If the style's sprite does not already contain an image with ID 'cat',
      // add the image 'cat-icon.png' to the style's sprite with the ID 'cat'.
      map.loadImage(
        'public/images/anticipatory-action-storm/moderate-tropical-storm.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('moderate-tropical-storm')) {
            map.addImage('moderate-tropical-storm', image!);
          }
        },
      );

      map.loadImage(
        'public/images/anticipatory-action-storm/severe-tropical-storm.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('severe-tropical-storm')) {
            map.addImage('severe-tropical-storm', image!);
          }
        },
      );

      map.loadImage(
        'public/images/anticipatory-action-storm/tropical-cyclone.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('tropical-cyclone')) {
            map.addImage('tropical-cyclone', image!);
          }
        },
      );

      map.loadImage(
        'public/images/anticipatory-action-storm/overland.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('overland')) {
            map.addImage('overland', image!);
          }
        },
      );
    }
    useEffect(() => {
      loadImages();
    }, []);

    return (
      <>
        {filterTimeSerieByWindType(['moderate tropical storm']).map(
          filteredTimeSerie => (
            <Source data={filteredTimeSerie} type="geojson">
              <Layer
                // beforeId={before}
                // id={layerId}
                type="symbol"
                layout={{ 'icon-image': ['image', 'moderate-tropical-storm'] }}
              />
            </Source>
          ),
        )}
        {filterTimeSerieByWindType(['severe tropical storm']).map(
          filteredTimeSerie => (
            <Source data={filteredTimeSerie} type="geojson">
              <Layer
                // beforeId={before}
                // id={layerId}
                type="symbol"
                layout={{ 'icon-image': ['image', 'severe-tropical-storm'] }}
              />
            </Source>
          ),
        )}
        {filterTimeSerieByWindType([
          'tropical cyclone',
          'intense tropical cyclone',
        ]).map(filteredTimeSerie => (
          <Source data={filteredTimeSerie} type="geojson">
            <Layer
              // beforeId={before}
              // id={layerId}
              type="symbol"
              layout={{ 'icon-image': ['image', 'tropical-cyclone'] }}
            />
          </Source>
        ))}

        {filterTimeSerieByWindType([
          // 'disturbance',
          // 'tropical disturbance',
          // 'tropical depression',
          'inland',
          // 'post-tropical depression',
          // 'extratropical system',
        ]).map(filteredTimeSerie => (
          <Source data={filteredTimeSerie} type="geojson">
            <Layer
              // beforeId={before}
              // id={layerId}
              type="symbol"
              layout={{ 'icon-image': ['image', 'overland'] }}
            />
          </Source>
        ))}

        <AAStormPopup timeSeries={timeSeries} />
      </>
    );
  },
);

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
  mapRef: MapRef;
}

export default AnticipatoryActionStormLayer;
