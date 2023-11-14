import React from 'react';
import { makeStyles, LinearProgress } from '@material-ui/core';
import { LayerKey } from 'config/types';

export interface LoadingBarProps {
  layerId: LayerKey | undefined;
  tileLayerIds: string[];
  vectorLayerIds: string[];
}

const useStyles = makeStyles({
  root: {
    marginTop: 5,
    marginBottom: 5,
    height: 2,
  },
  bar: {
    opacity: 0.8,
  },
  hide: {
    opacity: 0,
  },
});

function LoadingBar({
  layerId,
  tileLayerIds,
  vectorLayerIds,
}: LoadingBarProps) {
  const loading = layerId
    ? tileLayerIds.includes(layerId) || vectorLayerIds.includes(layerId)
    : false;
  const classes = useStyles();
  return (
    <LinearProgress
      variant="indeterminate"
      classes={{
        root: classes.root,
        bar: loading ? classes.bar : classes.hide,
      }}
    />
  );
}

export default LoadingBar;
