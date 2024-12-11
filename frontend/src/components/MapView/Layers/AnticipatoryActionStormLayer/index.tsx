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
import { AAFiltersSelector } from 'context/anticipatoryAction/AAStormStateSlice';
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
    const { viewType } = useSelector(AAFiltersSelector);
    const boundaryLayerState = useSelector(
      layerDataSelector(boundaryLayer.id),
    ) as LayerData<BoundaryLayerProps> | undefined;
    const { data: boundaryData } = boundaryLayerState || {};

    const [selectedFeature, setSelectedFeature] =
      useState<Feature<Point> | null>(null);

    /* this is the date the layer data corresponds to. It will be stored in redux ultimately */
    // const layerDataDate = '2024-03-11';

    // Add state for storm data
    const [AAStormData, setAAStormData] = useState<any>(null);

    // Add fetch effect
    useEffect(() => {
      const fetchStormData = async () => {
        try {
          const response = await fetch(
            'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/latest.json',
          );
          const stormData = await response.json();
          setAAStormData(stormData);
        } catch (error) {
          console.error('Error fetching storm data:', error);
        }
      };

      fetchStormData();
    }, []);

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
    const timeSeries: any = AAStormData
      ? enhanceTimeSeries(AAStormData.time_series as unknown as TimeSeries)
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

      const districts89kmh = [
        'Angoche',
        'Maganja Da Costa',
        'Machanga',
        'Govuro',
      ];
      const districts119kmh = [
        'Mogincual',
        'Namacurra',
        'Cidade Da Beira',
        'Buzi',
        'Dondo',
        'Vilankulo',
      ];

      return {
        ...boundaryData,
        features: boundaryData.features
          .map(feature => {
            const districtName =
              feature.properties?.[boundaryLayer.adminLevelLocalNames[1]];

            if (
              districts89kmh.includes(districtName) ||
              districts119kmh.includes(districtName)
            ) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  fillColor: '#808080',
                  fillOpacity: 0.4,
                },
              };
            }

            return null;
          })
          .filter(f => f !== null),
      };
    }, [boundaryData]);

    if (!AAStormData) {
      return null;
    }

    return (
      <>
        {/* Add the colored districts layer */}
        {coloredDistrictsLayer && (
          <Source
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
