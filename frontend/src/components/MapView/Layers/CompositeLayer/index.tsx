import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import { CompositeLayerProps } from 'config/types';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// to complete later
const styles = () => createStyles({});

interface Props extends WithStyles<typeof styles> {
  layer: CompositeLayerProps;
}

const CompositeLayer = ({ layer }: Props) => {
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

  console.log('data', data);

  return <>test</>;
};

export default withStyles(styles)(CompositeLayer);
