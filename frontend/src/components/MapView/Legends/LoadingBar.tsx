import { LinearProgress } from '@mui/material';
import { LayerKey } from 'config/types';
import { loadingLayerIdsSelector as vectorLayerIdsSelector } from 'context/mapStateSlice/selectors';
import { loadingLayerIdsSelector as tileLayerIdsSelector } from 'context/mapTileLoadingStateSlice';
import { layersLoadingDatesIdsSelector } from 'context/serverStateSlice';
import { useSelector } from 'react-redux';

import { loadingBarHiddenSx, loadingBarVisibleSx } from './legendStyles';

export interface LoadingBarProps {
  layerId: LayerKey | undefined;
}

function LoadingBar({ layerId }: LoadingBarProps) {
  const tileLayerIds = useSelector(tileLayerIdsSelector);
  const vectorLayerIds = useSelector(vectorLayerIdsSelector);
  const layersLoadingDatesIds = useSelector(layersLoadingDatesIdsSelector);
  const loading = layerId
    ? tileLayerIds.includes(layerId) ||
      vectorLayerIds.includes(layerId) ||
      layersLoadingDatesIds.includes(layerId)
    : false;

  return (
    <LinearProgress
      variant="indeterminate"
      sx={loading ? loadingBarVisibleSx : loadingBarHiddenSx}
    />
  );
}

export default LoadingBar;
