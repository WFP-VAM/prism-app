import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  IconButton,
  createStyles,
  Dialog,
  DialogContent,
  Grid,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';
import { LayerType } from '../../../config/types';
import { LayerDefinitions } from '../../../config/utils';

const LayerContentPreview = ({ layerId, classes }: PreviewProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const layer = LayerDefinitions[layerId || 'admin_boundaries'];
  const canDisplayContent = !layer.group || layer.group.main;
  const hasContent = layer.contentsPath && layer.contentsPath.length > 0;

  useEffect(() => {
    const path = `${process.env.PUBLIC_URL}/${layer.contentsPath}`;
    if (hasContent) {
      fetch(path)
        .then(response => response.text())
        .then(text => setContent(text));
    }
  }, [hasContent, layer.contentsPath]);

  return (
    <Grid item>
      <IconButton size="small" className={classes.icon}>
        {canDisplayContent && hasContent && (
          <InfoIcon fontSize="inherit" onClick={() => setOpen(true)} />
        )}
      </IconButton>
      <Dialog
        maxWidth="md"
        open={open}
        keepMounted
        onClose={() => setOpen(false)}
        aria-labelledby="dialog-preview"
      >
        <DialogContent>
          <Typography color="textSecondary">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
          </Typography>
        </DialogContent>
      </Dialog>
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
  layerId: LayerType['id'] | undefined;
}

export default withStyles(styles)(LayerContentPreview);
