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

const AnticipatoryActionStormLayer = React.memo(
  ({ layer }: AnticipatoryActionStormLayerProps) => {
    useDefaultDate(layer.id);
    const map = useSelector(mapSelector);

    const [selectedFeature, setSelectedFeature] =
      useState<Feature<Point> | null>(null);

    /* this is the date the layer data corresponds to. It will be stored in redux ultimately */
    // const layerDataDate = '2024-03-11';

    function enhanceTimeSeries(timeSeries: TimeSeries) {
      const { features, ...timeSeriesRest } = timeSeries;

      const newFeatures = features.map(feature => {
        const { properties, ...featureRest } = feature;
        const newProperties = {
          ...properties,
          iconName: getIconNameByWindType(properties.development),
        };
        return {
          ...featureRest,
          properties: newProperties,
        };
      });

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
          <Layer
            type="symbol"
            id="aa-storm-wind-points-layer"
            layout={{ 'icon-image': ['image', ['get', 'iconName']] }}
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

interface AnticipatoryActionStormLayerProps {
  layer: AnticipatoryActionLayerProps;
}

export default AnticipatoryActionStormLayer;
