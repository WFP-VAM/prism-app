import { LinearProgress } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useSelector } from 'react-redux';
import { LayerKey } from 'config/types';
import { loadingLayerIdsSelector as tileLayerIdsSelector } from 'context/mapTileLoadingStateSlice';
import { loadingLayerIdsSelector as vectorLayerIdsSelector } from 'context/mapStateSlice/selectors';
import { layersLoadingDatesIdsSelector } from 'context/serverStateSlice';

export interface LoadingBarProps {
  layerId: LayerKey | undefined;
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

function LoadingBar({ layerId }: LoadingBarProps) {
  const tileLayerIds = useSelector(tileLayerIdsSelector);
  const vectorLayerIds = useSelector(vectorLayerIdsSelector);
  const layersLoadingDatesIds = useSelector(layersLoadingDatesIdsSelector);
  const loading = layerId
    ? tileLayerIds.includes(layerId) ||
      vectorLayerIds.includes(layerId) ||
      layersLoadingDatesIds.includes(layerId)
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
