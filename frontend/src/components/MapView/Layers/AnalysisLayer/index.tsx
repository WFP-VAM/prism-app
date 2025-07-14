import { RefObject, useEffect } from 'react';
import { get } from 'lodash';
import { Layer, MapRef, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { addPopupData } from 'context/tooltipStateSlice';
import {
  analysisResultSelector,
  invertedColorsSelector,
  isAnalysisLayerActiveSelector,
} from 'context/analysisResultStateSlice';
import { legendToStops } from 'components/MapView/Layers/layer-utils';
import {
  AggregationOperations,
  LegendDefinition,
  MapEventWrapFunctionProps,
  units,
} from 'config/types';
import {
  AnalysisResult,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
import { getRoundedData } from 'utils/data-utils';
import { LayerDefinitions } from 'config/utils';
import { formatIntersectPercentageAttribute } from 'components/MapView/utils';
import { FillLayerSpecification, MapLayerMouseEvent } from 'maplibre-gl';
import {
  findFeature,
  getEvtCoords,
  getLayerMapId,
  useMapCallback,
} from 'utils/map-utils';
import { opacitySelector } from 'context/opacityStateSlice';
import { getFormattedDate } from 'utils/date-utils';
import { invertLegendColors } from 'components/MapView/Legends/utils';
import { layersSelector } from 'context/mapStateSlice/selectors';

const layerId = getLayerMapId('analysis');

const onClick =
  (analysisData: AnalysisResult | undefined) =>
  ({ dispatch, t }: MapEventWrapFunctionProps<undefined>) =>
  (evt: MapLayerMouseEvent) => {
    const coordinates = getEvtCoords(evt);

    if (!analysisData) {
      return;
    }

    const feature = findFeature(layerId, evt);
    if (!feature) {
      return;
    }

    // Statistic Data
    if (analysisData instanceof PolygonAnalysisResult) {
      const stats = JSON.parse(feature.properties['zonal:stat:classes']);
      // keys are the zonal classes like ['60 km/h', 'Uncertainty Cones']
      const keys = Object.keys(stats).filter(key => key !== 'null');
      const popupData = Object.fromEntries(
        keys.map(key => [
          key,
          {
            // we convert the percentage from a number like 0.832 to something that is
            // more intuitive and can fit in the popup better like "83%"
            data: `${Math.round(stats[key].percentage * 100)}%`,
            coordinates,
          },
        ]),
      );
      dispatch(addPopupData(popupData));
    } else {
      const statisticKey = analysisData.statistic;
      const precision =
        analysisData instanceof ExposedPopulationResult ? 0 : undefined;
      const formattedProperties = formatIntersectPercentageAttribute(
        feature.properties,
      );
      dispatch(
        addPopupData({
          [t('Analysis layer')]: {
            data: (analysisData as ExposedPopulationResult).getLayerTitle(t),
            coordinates,
          },
          ...(analysisData.analysisDate
            ? {
                [t('Date analyzed')]: {
                  data: getFormattedDate(
                    analysisData.analysisDate,
                    'locale',
                    t('date_locale'),
                  ) as string,
                  coordinates,
                },
              }
            : {}),
          [analysisData.getStatLabel(t)]: {
            data: `${getRoundedData(
              formattedProperties[statisticKey],
              t,
              precision,
            )} ${units[statisticKey] || ''}`,
            coordinates,
          },
        }),
      );
      if (statisticKey === AggregationOperations['Area exposed']) {
        dispatch(
          addPopupData({
            [`${analysisData.getLayerTitle(t)} (${t('Area exposed in km²')})`]:
              {
                data: `${getRoundedData(
                  formattedProperties.stats_intersect_area || null,
                  t,
                  precision,
                )} ${units.stats_intersect_area}`,
                coordinates,
              },
          }),
        );
      }
    }

    if (analysisData instanceof BaselineLayerResult) {
      const baselineLayer = analysisData.getBaselineLayer();
      if (baselineLayer?.title) {
        dispatch(
          addPopupData({
            [baselineLayer.title]: {
              data: getRoundedData(get(feature, 'properties.data'), t),
              coordinates,
            },
          }),
        );
      }
    }

    if (analysisData instanceof ExposedPopulationResult && analysisData.key) {
      dispatch(
        addPopupData({
          [analysisData.key]: {
            // TODO - consider using a simple safeTranslate here instead.
            data: getRoundedData(
              get(feature, `properties.${analysisData.key}`),
              t,
            ),
            coordinates,
          },
        }),
      );
    }
  };

// We use the legend values from the baseline layer
function fillPaintData(
  legend: LegendDefinition,
  property: string,
  opacity: number = 0.3,
): FillLayerSpecification['paint'] {
  return {
    'fill-opacity': opacity,
    'fill-color': {
      property,
      stops: legendToStops(legend),
      type: 'interval',
    },
  };
}

function AnalysisLayer({
  before,
  mapRef,
}: {
  before?: string;
  mapRef: RefObject<MapRef>;
}) {
  // TODO maybe in the future we can try add this to LayerType so we don't need exclusive code in Legends and MapView to make this display correctly
  // Currently it is quite difficult due to how JSON focused the typing is. We would have to refactor it to also accept layers generated on-the-spot
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const opacityState = useSelector(opacitySelector('analysis'));
  const invertedColorsForAnalysis = useSelector(invertedColorsSelector);
  useMapCallback('click', layerId, undefined, onClick(analysisData));
  const layers = useSelector(layersSelector);
  const boundaryLayer = layers.find(
    layer => layer.id === analysisData?.baselineLayerId,
  )?.id;
  const boundary =
    analysisData && 'boundaryId' in analysisData && analysisData.boundaryId
      ? getLayerMapId(analysisData.boundaryId)
      : before;

  const legend =
    analysisData && invertedColorsForAnalysis
      ? invertLegendColors(analysisData.legend)
      : analysisData?.legend;

  useEffect(() => {
    if (
      analysisData instanceof BaselineLayerResult &&
      analysisData.adminBoundariesFormat === 'pmtiles'
    ) {
      // Step 1: Get a reference to your map
      const map = mapRef.current?.getMap();

      if (!map) {
        return;
      }

      // Step 2: Define the source and layer IDs for your admin boundary layer
      const boundarySourceId = `source-${boundaryLayer}`;

      // Step 3: Get all features from the admin boundary layer
      // Option 1: Query rendered features (visible in current view)
      const features = map.queryRenderedFeatures({ layers: [boundary] });
      const { statistic } = analysisData;
      // Step 4: Match features with analysisData and set feature state
      // Assuming analysisData.featureCollection.features contains your feature data
      features.forEach(feature => {
        try {
          const adminId = feature.properties.dv_adm0_id;

          // Find matching data in analysisData feature collection
          const matchingFeature = analysisData.featureCollection.features.find(
            f => f.dv_adm0_id === adminId,
          );

          if (matchingFeature) {
            // Set feature state based on properties in matchingFeature
            map.setFeatureState(
              {
                source: boundarySourceId,
                sourceLayer: boundary,
                id: matchingFeature.dv_adm0_id,
              },
              {
                data: matchingFeature[statistic],
                selected: true,
              },
            );
          }
        } catch (error) {
          console.error('Error setting feature state', error);
        }
      });

      // Step 5: Apply styling based on fillPaintData
      // Create a legend from your analysisData

      const property = statistic; // The property name you set in feature state

      // Apply the fill paint style to your layer
      map.setPaintProperty(boundary, 'fill-color', {
        property,
        stops: legendToStops(legend),
        type: 'interval',
      });

      // Set the opacity
      map.setPaintProperty(boundary, 'fill-opacity', 0.7);
    }
  }, [analysisData, mapRef]);

  if (!analysisData || !isAnalysisLayerActive) {
    return null;
  }

  const baselineIsBoundary =
    'baselineLayerId' in analysisData &&
    LayerDefinitions[analysisData.baselineLayerId!]?.type === 'boundary';

  const defaultProperty = (() => {
    switch (true) {
      case analysisData instanceof ExposedPopulationResult:
        return analysisData.statistic as string;
      case analysisData instanceof PolygonAnalysisResult:
        return 'zonal:stat:percentage';
      case analysisData instanceof BaselineLayerResult:
        return baselineIsBoundary ? analysisData.statistic : 'data';
      default:
        return 'data';
    }
  })();

  return (
    <Source data={analysisData.featureCollection} type="geojson">
      <Layer
        id={layerId}
        type="fill"
        beforeId={boundary}
        paint={fillPaintData(legend, defaultProperty, opacityState)}
      />
    </Source>
  );
}

export default AnalysisLayer;
