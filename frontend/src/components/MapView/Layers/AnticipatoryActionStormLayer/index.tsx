import React, { useEffect, useState } from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import {
  Source,
  Layer,
  MapRef,
  MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import { Feature, Point } from 'geojson';
import AAStormDatePopup, { TimeSeries } from './AAStormDatePopup';
import AAStormData from '../../../../../public/data/mozambique/anticipatory-action/aa_storm_temporary.json';
import AAStormLandfallPopup from './AAStormLandfallPopup';
import { formatReportDate } from './utils';
import moderateStorm from '../../../../../public/images/anticipatory-action-storm/moderate-tropical-storm.png';
import overland from '../../../../../public/images/anticipatory-action-storm/overland.png';
import severeTropicalStorm from '../../../../../public/images/anticipatory-action-storm/severe-tropical-storm.png';
import tropicalCyclone from '../../../../../public/images/anticipatory-action-storm/tropical-cyclone.png';
// import intensiveCyclone from '../../../../../public/images/anticipatory-action-storm/very-intensive-tropical-cycloone.png';

const AnticipatoryActionStormLayer = React.memo(
  ({ layer, mapRef }: AnticipatoryActionStormLayerProps) => {
    useDefaultDate(layer.id);

    const [selectedFeature, setSelectedFeature] =
      useState<Feature<Point> | null>(null);

    /* this is the date the layer data corresponds to. It will be stored in redux ultimately */
    // const layerDataDate = '2024-03-11';

    const onWindPointsClicked = (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const feature = e.features?.[0];
      setSelectedFeature(feature as Feature<Point>);
    };

    // This function enhances the time series data by adding a line and icons to the points
    function enhanceTimeSeries(timeSeries: TimeSeries) {
      const { features, ...timeSeriesRest } = timeSeries;

      // Create coordinates array for the line
      const lineCoordinates = features.map(
        feature => (feature.geometry as Point).coordinates,
      );

      // Split line into segments (past and future)
      const splitTime = '2024-03-12';
      const splitIndex = features.findIndex(f => f.properties.time > splitTime);

      const pastLineFeature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: lineCoordinates.slice(0, splitIndex),
        },
        properties: { lineType: 'past' },
      } as Feature<any>;

      const futureLineFeature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: lineCoordinates.slice(splitIndex - 1), // Overlap by 1 point to avoid gaps
        },
        properties: { lineType: 'future' },
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

    const timeSeries: TimeSeries = enhanceTimeSeries(
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

    function loadImages() {
      const map = mapRef.getMap();

      const loadImage = (url: string, name: string) => {
        map.loadImage(url, (error, image) => {
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
    }

    useEffect(() => {
      loadImages();
    });

    // Display a pointer cursor when hovering over the wind points
    useEffect(() => {
      const map = mapRef.getMap();

      const handleMouseEnter = () => {
        // eslint-disable-next-line fp/no-mutation
        map.getCanvas().style.cursor = 'pointer';
      };

      const handleMouseLeave = () => {
        // eslint-disable-next-line fp/no-mutation
        map.getCanvas().style.cursor = '';
      };

      map.on('mouseenter', 'aa-storm-wind-points-layer', handleMouseEnter);
      map.on('mouseleave', 'aa-storm-wind-points-layer', handleMouseLeave);
      map.on('click', 'aa-storm-wind-points-layer', onWindPointsClicked);

      return () => {
        map.off('mouseenter', 'aa-storm-wind-points-layer', handleMouseEnter);
        map.off('mouseleave', 'aa-storm-wind-points-layer', handleMouseLeave);
        map.off('click', 'aa-storm-wind-points-layer', onWindPointsClicked);
      };
    });

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

        <Source data={timeSeries} type="geojson">
          {/* Past track - dashed black line */}
          <Layer
            type="line"
            id="aa-storm-wind-points-line-past"
            filter={['==', ['get', 'lineType'], 'past']}
            paint={{
              'line-color': 'black',
              'line-width': 2,
            }}
          />
          {/* Future track - solid grey line */}
          <Layer
            type="line"
            id="aa-storm-wind-points-line-future"
            filter={['==', ['get', 'lineType'], 'future']}
            paint={{
              'line-color': 'red',
              'line-width': 2,
              'line-dasharray': [2, 1],
            }}
          />
          <Layer
            type="symbol"
            id="aa-storm-wind-points-layer"
            layout={{ 'icon-image': ['image', ['get', 'iconName']] }}
          />
        </Source>

        <AAStormDatePopup timeSeries={timeSeries} />

        {selectedFeature && (
          <AAStormLandfallPopup
            point={selectedFeature.geometry}
            reportDate={formatReportDate(selectedFeature.properties?.time)}
            landfallInfo={AAStormData.landfall_info}
            onClose={() => landfallPopupCloseHandler()}
          />
        )}
      </>
    );
  },
);

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
  mapRef: MapRef;
}

export default AnticipatoryActionStormLayer;
