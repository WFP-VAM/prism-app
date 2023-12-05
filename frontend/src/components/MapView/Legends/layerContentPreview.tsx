import React, { useState, memo, useMemo, useCallback } from 'react';
import {
  IconButton,
  createStyles,
  Grid,
  Theme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';
import { useDispatch } from 'react-redux';
import { LayerType } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import ContentDialog from 'components/NavBar/ContentDialog';
import { loadLayerContent } from 'utils/load-layer-utils';

const LayerContentPreview = memo(({ layerId, classes }: PreviewProps) => {
  const [content, setContent] = useState<string | undefined>(undefined);

  const dispatch = useDispatch();

  const layer = LayerDefinitions[layerId || 'admin_boundaries'];

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
      <Grid item>
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

const styles = (theme: Theme) =>
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
  });

export interface PreviewProps extends WithStyles<typeof styles> {
  layerId?: LayerType['id'];
}

export default withStyles(styles)(LayerContentPreview);
