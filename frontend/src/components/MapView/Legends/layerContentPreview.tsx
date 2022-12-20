import React, { useRef, useState, useLayoutEffect } from 'react';
import {
  IconButton,
  createStyles,
  Grid,
  Theme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';
import { LayerType } from '../../../config/types';
import { LayerDefinitions } from '../../../config/utils';
import ContentDialog, { loadLayerContent } from '../../NavBar/ContentDialog';

const LayerContentPreview = ({ layerId, classes }: PreviewProps) => {
  const [content, setContent] = useState<string | undefined>(undefined);
  const contentRef = useRef<HTMLHeadingElement>(null);
  const layer = LayerDefinitions[layerId || 'admin_boundaries'];

  useLayoutEffect(() => {
    if (contentRef.current !== null) {
      contentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });

  if (!layer.contentPath) {
    return null;
  }

  return (
    <Grid item>
      <IconButton size="small" className={classes.icon}>
        <InfoIcon
          fontSize="inherit"
          onClick={() => loadLayerContent(layer.contentPath!, setContent)}
        />
      </IconButton>
      <ContentDialog content={content} setContent={setContent} />
    </Grid>
  );
};

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
