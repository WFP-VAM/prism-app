import InfoIcon from '@mui/icons-material/Info';
import { Grid, IconButton } from '@mui/material';
import ContentDialog from 'components/NavBar/ContentDialog';
import { LayerType } from 'config/types';
import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import { memo, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loadLayerContent } from 'utils/load-layer-utils';

const LayerContentPreview = memo(({ layerId }: PreviewProps) => {
  const [content, setContent] = useState<string | undefined>(undefined);

  const dispatch = useDispatch();

  const layer =
    layerId === 'analysis' || !layerId
      ? getBoundaryLayerSingleton()
      : LayerDefinitions[layerId];

  const handleIconButtonClick = useCallback(async () => {
    if (!layer.contentPath) {
      return;
    }
    const layerContent = await loadLayerContent(layer.contentPath, dispatch);
    setContent(layerContent);
  }, [dispatch, layer.contentPath]);

  const handleDialogClose = useCallback(() => {
    setContent(undefined);
  }, []);

  const elementIdToScroll = useMemo(() => {
    if (!layer.contentPath) {
      return undefined;
    }
    // We take the second item of the array which will be the id of the element to scroll
    return layer.contentPath.split('#')[1];
  }, [layer.contentPath]);

  const renderedContentDialog = useMemo(() => {
    if (!content) {
      return null;
    }
    return (
      <ContentDialog
        content={content}
        elementId={elementIdToScroll}
        handleClose={handleDialogClose}
      />
    );
  }, [content, elementIdToScroll, handleDialogClose]);

  return useMemo(() => {
    if (!layer.contentPath) {
      return null;
    }
    return (
      <Grid>
        <IconButton
          onClick={handleIconButtonClick}
          size="small"
          sx={{
            top: '-4px',
            fontSize: '14px',
          }}
        >
          <InfoIcon fontSize="inherit" />
        </IconButton>
        {renderedContentDialog}
      </Grid>
    );
  }, [handleIconButtonClick, layer.contentPath, renderedContentDialog]);
});

export interface PreviewProps {
  layerId: LayerType['id'] | 'analysis';
}

export default LayerContentPreview;
