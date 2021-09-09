import React, { useRef, useState, useEffect } from 'react';
import { parse } from 'htmlstring-to-react';
import marked from 'marked';
import DOMPurify from 'dompurify';
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
  const contentRef = useRef<HTMLHeadingElement>(null);
  const layer = LayerDefinitions[layerId || 'admin_boundaries'];
  const canDisplayContent = !layer.group || layer.group.main;
  const hasContent = layer.contentPath && layer.contentPath.length > 0;

  const domId = layer.contentPath && layer.contentPath.split('#')[1];

  marked.use({ sanitizer: DOMPurify.sanitize });

  useEffect(() => {
    const path = `${process.env.PUBLIC_URL}/${layer.contentPath}`;

    if (hasContent) {
      fetch(path)
        .then(response => response.text())
        .then(text => setContent(text));
    }
  }, [hasContent, layer.contentPath]);

  const transform = {
    overrides: {
      h1: (props: any, textContext: string | undefined) => {
        const { id } = props;
        if (contentRef.current && id && id === domId) {
          contentRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
        return <h1 ref={contentRef}>{textContext}</h1>;
      },
    },
  };

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
            {parse(marked(content), transform)}
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
