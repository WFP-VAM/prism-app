import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import { CompositeLayerProps } from 'config/types';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer } from 'react-map-gl/maplibre';
import useLayers from 'utils/layers-utils';
import { getLayerMapId } from 'utils/map-utils';
import { CircleLayerSpecification } from 'maplibre-gl';
import { Point } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

const styles = () => createStyles({});

interface Props extends WithStyles<typeof styles> {
  layer: CompositeLayerProps;
  before?: string;
}

const paintProps: (
  opacity: number | undefined,
) => CircleLayerSpecification['paint'] = (opacity?: number) => ({
  'circle-opacity': opacity || 0.5,
  'circle-color': [
    'interpolate',
    ['linear'],
    ['get', 'value'],
    -2,
    '#FFFF33',
    2,
    '#FF8433',
  ],
  'circle-radius': [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
    // this is actually a list of pairs "zoom,size"
    7,
    8,
    10,
    20,
    13,
    200,
    16,
    300,
  ],
});

const CompositeLayer = ({ layer, before }: Props) => {
  // look to refacto with impactLayer and maybe other layers
  const { data, date } =
    (useSelector(layerDataSelector(layer.id)) as LayerData<
      CompositeLayerProps
    >) || {};
  const dispatch = useDispatch();

  useEffect(() => {
    if (!data) {
      dispatch(loadLayerData({ layer }));
    }
  }, [dispatch, layer, data, date]);

  const { adminBoundaryLimitPolygon } = useLayers();

  if (data && adminBoundaryLimitPolygon) {
    const filteredData = {
      ...data,
      features: data.features.filter(feature => {
        return (
          !adminBoundaryLimitPolygon ||
          booleanPointInPolygon(
            (feature.geometry as Point).coordinates,
            adminBoundaryLimitPolygon as any,
          )
        );
      }),
    };
    return (
      <Source type="geojson" data={filteredData}>
        <Layer
          id={getLayerMapId(layer.id)}
          type="circle"
          paint={paintProps(layer.opacity)}
          beforeId={before}
        />
      </Source>
    );
  }

  return null;
};

export default memo(withStyles(styles)(CompositeLayer));
