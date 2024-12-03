import React, { useEffect } from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapRef } from 'react-map-gl/maplibre';
import AAStormDatePopup, { TimeSeries } from './AAStormDatePopup';
import AAStormData from '../../../../../public/data/mozambique/anticipatory-action/aa_storm_temporary.json';
import AAStormLandfallPopup from './AAStormLandfallPopup';

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
        <Source
          data={AAStormData.ready_set_results.exposed_area_48kt.polygon}
          type="geojson"
        >
          <Layer
            type="fill"
            paint={{ 'fill-opacity': 0.5, 'fill-color': '#ff8934' }}
          />
        </Source>
        <Source
          data={AAStormData.ready_set_results.exposed_area_64kt.polygon}
          type="geojson"
        >
          <Layer
            type="fill"
            paint={{ 'fill-opacity': 0.5, 'fill-color': '#e63701' }}
          />
        </Source>
        {filterTimeSerieByWindType(['moderate tropical storm']).map(
          filteredTimeSerie => (
            <Source data={filteredTimeSerie} type="geojson">
              <Layer
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
              type="symbol"
              layout={{ 'icon-image': ['image', 'overland'] }}
            />
          </Source>
        ))}

        <AAStormDatePopup timeSeries={timeSeries} />
        <AAStormLandfallPopup
          points={{
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [39.67, -20.25],
                },
                properties: null,
              },
            ],
          }}
          landfallInfo={AAStormData.landfall_info}
        />
      </>
    );
  },
);

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
  mapRef: MapRef;
}

export default AnticipatoryActionStormLayer;
