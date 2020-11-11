import React from 'react';
import {
  Button,
  createStyles,
  Grid,
  Hidden,
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

  const download = () => {
    if (selectedMap) {
      const img = selectedMap.getCanvas().toDataURL('image/png');
      const link = document.createElement('a');
      link.href = img;
      link.setAttribute('download', 'map.png');
      link.click();
    }
  };

  return (
    <Grid item>
      <Button variant="contained" color="primary" onClick={() => download()}>
        <FontAwesomeIcon style={{ fontSize: '1em' }} icon={faDownload} />
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Download
          </Typography>
        </Hidden>
      </Button>
    </Grid>
  );
}

const styles = () =>
  createStyles({
    label: {
      marginLeft: '10px',
    },
  });

export interface DownloadProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Download);
