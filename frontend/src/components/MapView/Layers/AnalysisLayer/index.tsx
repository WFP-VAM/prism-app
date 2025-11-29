import { RefObject } from 'react';
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

    // Statistic Data for polygon analysis
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
      return;
    }

    // Common entries
    const makeBaseEntries = (layerTitle: string) =>
      ({
        [t('Analysis layer')]: { data: layerTitle, coordinates },
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
      }) as Record<
        string,
        { data: string | number | null; coordinates: GeoJSON.Position }
      >;

    const layerTitle = (
      analysisData as BaselineLayerResult | ExposedPopulationResult
    ).getLayerTitle(t);

    // PMTiles-based analysis layer
    if (
      analysisData instanceof BaselineLayerResult &&
      analysisData.adminBoundariesFormat === 'pmtiles'
    ) {
      const adminCodeProperty = analysisData.getBaselineLayer().adminCode;
      const stats = analysisData.statsByAdminId?.find(
        stat =>
          stat[adminCodeProperty] === feature.properties[adminCodeProperty],
      );
      if (stats) {
        const statisticKey = analysisData.statistic;
        const baseEntries = makeBaseEntries(layerTitle);
        dispatch(
          addPopupData({
            ...baseEntries,
            [analysisData.getStatLabel(t)]: {
              data: `${getRoundedData(stats[statisticKey], t)} ${
                units[statisticKey] || ''
              }`,
              coordinates,
            },
          }),
        );
      }
    } else {
      // GeoJSON-based analysis layer
      const statisticKey = analysisData.statistic;
      const precision =
        analysisData instanceof ExposedPopulationResult ? 0 : undefined;
      const formattedProperties = formatIntersectPercentageAttribute(
        feature.properties,
      );
      const baseEntries = makeBaseEntries(layerTitle);

      dispatch(
        addPopupData({
          ...baseEntries,
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

function PMTilesAnalysisLayer({
  before,
  mapRef,
  legend,
  boundaryLayerId,
  effectiveBoundaryId,
}: {
  before?: string;
  mapRef: RefObject<MapRef | null>;
  legend: LegendDefinition;
  boundaryLayerId?: string;
  effectiveBoundaryId?: string;
}) {
  const analysisData = useSelector(
    analysisResultSelector,
  ) as BaselineLayerResult;
  const opacityState = useSelector(opacitySelector('analysis'));
  const layers = useSelector(layersSelector);

  const boundarySourceId = `source-${boundaryLayerId}`;
  const { statistic } = analysisData;

  if (!effectiveBoundaryId || !boundarySourceId) {
    return null;
  }

  const fullBoundaryLayer = layers.find(layer => layer.id === boundaryLayerId);
  if (!fullBoundaryLayer || fullBoundaryLayer.type !== 'boundary') {
    return null;
  }

  const stops = legendToStops(legend);

  const createPropertyBasedExpression = () => {
    if (!analysisData.statsByAdminId || !fullBoundaryLayer) {
      return 'transparent';
    }

    const adminCodeProperty = fullBoundaryLayer.adminCode;

    const findColorForValue = (statValue: number): string => {
      const breakIndex = stops.findIndex(
        ([threshold]) => statValue < threshold,
      );

      if (breakIndex === -1) {
        // No break found, use the last color
        return stops.length > 0 ? stops[stops.length - 1][1] : 'transparent';
      }
      // Use color from the element before the break
      return stops[breakIndex - 1][1];
    };

    const caseConditions = analysisData.statsByAdminId.reduce<any[]>(
      (acc, dataItem: any) => {
        const adminId = dataItem[adminCodeProperty];
        const statValue = dataItem[`stats_${statistic}`] || dataItem[statistic];

        if (statValue !== undefined && adminId !== undefined) {
          const color = findColorForValue(statValue);
          return [...acc, ['==', ['get', adminCodeProperty], adminId], color];
        }
        return acc;
      },
      [],
    );

    return ['case', ...caseConditions, 'transparent'];
  };

  const propertyBasedColorExpression = createPropertyBasedExpression();

  const propertyBasedPaintProperties: FillLayerSpecification['paint'] = {
    'fill-color': propertyBasedColorExpression as any,
    'fill-opacity': opacityState || 0.7,
  };

  const finalPaintProperties = propertyBasedPaintProperties;

  const boundaryFillLayerId = `${effectiveBoundaryId}-fill`;
  const map = mapRef.current?.getMap();
  const beforeId = map?.getLayer(boundaryFillLayerId)
    ? boundaryFillLayerId
    : before;

  return (
    <Layer
      id={layerId}
      type="fill"
      source={boundarySourceId}
      source-layer={fullBoundaryLayer.layerName}
      beforeId={beforeId}
      paint={finalPaintProperties}
    />
  );
}

function GeoJSONAnalysisLayer({
  legend,
  effectiveBoundaryId,
}: {
  legend: LegendDefinition;
  effectiveBoundaryId?: string;
}) {
  const analysisData = useSelector(
    analysisResultSelector,
  ) as BaselineLayerResult;
  const opacityState = useSelector(opacitySelector('analysis'));
  const baselineIsBoundary =
    'baselineLayerId' in analysisData &&
    analysisData instanceof BaselineLayerResult &&
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
        beforeId={effectiveBoundaryId}
        paint={fillPaintData(legend, defaultProperty, opacityState)}
      />
    </Source>
  );
}

function AnalysisLayer({
  before,
  mapRef,
}: {
  before?: string;
  mapRef: RefObject<MapRef | null>;
}) {
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const invertedColorsForAnalysis = useSelector(invertedColorsSelector);
  const layers = useSelector(layersSelector);

  useMapCallback('click', layerId, undefined, onClick(analysisData));
  // Raw layer ID: analysis boundaryId > baseline layerId > undefined
  const boundaryLayerId = (() => {
    if (
      analysisData &&
      'boundaryId' in analysisData &&
      analysisData.boundaryId
    ) {
      return analysisData.boundaryId;
    }
    return layers.find(
      layer =>
        layer.id ===
        (analysisData instanceof BaselineLayerResult
          ? analysisData.baselineLayerId
          : undefined),
    )?.id;
  })();

  // Processed map layer ID for rendering, with fallback to 'before'
  const effectiveBoundaryId = boundaryLayerId
    ? getLayerMapId(boundaryLayerId)
    : before;
  const legend =
    analysisData && invertedColorsForAnalysis
      ? invertLegendColors(analysisData.legend)
      : analysisData?.legend;

  if (!analysisData || !isAnalysisLayerActive || !legend) {
    return null;
  }

  const isPMTiles =
    analysisData instanceof BaselineLayerResult &&
    analysisData.adminBoundariesFormat === 'pmtiles';

  if (isPMTiles) {
    return (
      <PMTilesAnalysisLayer
        before={before}
        mapRef={mapRef}
        legend={legend}
        boundaryLayerId={boundaryLayerId}
        effectiveBoundaryId={effectiveBoundaryId}
      />
    );
  }

  return (
    <GeoJSONAnalysisLayer
      legend={legend}
      effectiveBoundaryId={effectiveBoundaryId}
    />
  );
}

export default AnalysisLayer;
