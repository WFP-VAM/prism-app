import React, { useEffect, useRef } from 'react';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Hidden,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

import { useSelector } from 'react-redux';
import { mapSelector } from '../../../context/mapStateSlice/selectors';

function Download({ classes }: DownloadProps) {
  const selectedMap = useSelector(mapSelector);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    if (open && selectedMap) {
      const activeLayers = selectedMap.getCanvas();
      const canvas = previewRef.current;
      canvas!.setAttribute('width', activeLayers.width.toString());
      canvas!.setAttribute('height', activeLayers.height.toString());
      const context = canvas!.getContext('2d');
      context!.drawImage(activeLayers, 0, 0);
    }
  });

  const handleClose = () => {
    setOpen(false);
  };

  const download = () => {
    const canvas = previewRef!.current;
    const img = canvas!.toDataURL('image/png');
    const link = document.createElement('a');
    link.setAttribute('href', img);
    link.setAttribute('download', 'map.png');
    link.click();
    setOpen(false);
  };

  return (
    <Grid item>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        <FontAwesomeIcon style={{ fontSize: '1em' }} icon={faDownload} />
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Download
          </Typography>
        </Hidden>
      </Button>
      <Dialog
        maxWidth="xl"
        open={open}
        keepMounted
        onClose={handleClose}
        aria-labelledby="dialog-preview"
      >
        <DialogTitle className={classes.title} id="dialog-preview">
          Map Preview
        </DialogTitle>
        <DialogContent>
          <canvas ref={previewRef} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button variant="contained" onClick={download} color="primary">
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    label: {
      marginLeft: '10px',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface DownloadProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Download);
