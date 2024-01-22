import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import { CompositeLayerProps } from 'config/types';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer } from 'react-map-gl/maplibre';
import { getLayerMapId } from 'utils/map-utils';
import { CircleLayerSpecification } from 'maplibre-gl';

// to complete later
const styles = () => createStyles({});

interface Props extends WithStyles<typeof styles> {
  layer: CompositeLayerProps;
  before?: string;
}

const scale = 5;

const paintProps: CircleLayerSpecification['paint'] = {
  'circle-color': [
    'interpolate',
    // Set the exponential rate of change to 0.5
    ['linear'],
    ['get', 'value'],
    // When zoom is 15, buildings will be beige.
    -2,
    '#FFFF33',
    // When zoom is 18 or higher, buildings will be yellow.
    2,
    '#FF8433',
  ],
  'circle-radius': [
    'interpolate',
    // Set the exponential rate of change to 0.5
    ['exponential', 2],
    ['zoom'],
    // When zoom is 0, radius will be 1px.
    0,
    1 * scale,
    // When zoom is 15 or higher, radius will be 15px.
    15,
    16 * scale,
  ],
};

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

  if (data) {
    return (
      <Source type="geojson" data={data}>
        <Layer
          id={getLayerMapId(layer.id)}
          type="circle"
          paint={paintProps}
          beforeId={before}
        />
      </Source>
    );
  }

  return null;
};

export default memo(withStyles(styles)(CompositeLayer));
