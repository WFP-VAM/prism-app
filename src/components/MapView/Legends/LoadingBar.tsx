import React from 'react';
import { makeStyles, LinearProgress } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { LayerKey } from '../../../config/types';
import { loadingLayerIdsSelector } from '../../../context/mapTileLoadingStateSlice';

export interface LoadingBarProps {
  layerId: LayerKey | undefined;
}

const useStyles = makeStyles({
  root: {
    marginTop: 3,
    marginBottom: 3,
    height: 2,
  },
  bar: {
    opacity: 0.8,
  },
  hide: {
    opacity: 0,
  },
});

function LoadingBar({ layerId }: LoadingBarProps) {
  const loadingLayerIds = useSelector(loadingLayerIdsSelector);
  const loading = layerId && loadingLayerIds.includes(layerId);
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
