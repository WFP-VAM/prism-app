import { useState, memo, useMemo, useCallback } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { IconButton, Grid, Theme } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useDispatch } from 'context/hooks';
import { LayerType } from 'config/types';
import { LayerDefinitions, getBoundaryLayerSingleton } from 'config/utils';
import ContentDialog from 'components/NavBar/ContentDialog';
import { loadLayerContent } from 'utils/load-layer-utils';

const LayerContentPreview = memo(({ layerId }: PreviewProps) => {
  const classes = useStyles();
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
          className={classes.icon}
        >
          <InfoIcon fontSize="inherit" />
        </IconButton>
        {renderedContentDialog}
      </Grid>
    );
  }, [
    classes.icon,
    handleIconButtonClick,
    layer.contentPath,
    renderedContentDialog,
  ]);
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    icon: {
      top: '-4px',
      fontSize: '14px',
    },
    label: {
      marginLeft: '10px',
    },
    title: {
      color: theme.palette.text.secondary,
      fontWeight: 'bold',
      minWidth: '600px',
    },
  }),
);

export interface PreviewProps {
  layerId: LayerType['id'] | 'analysis';
}

export default LayerContentPreview;
