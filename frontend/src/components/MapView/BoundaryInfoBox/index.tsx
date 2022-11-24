import React from 'react';
import {
  createStyles,
  Paper,
  Theme,
  TextField,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import {
  boundsSelector,
  zoomSelector,
} from '../../../context/mapBoundaryInfoStateSlice';

function LocationBox({ classes }: LocationBoxProps) {
  const bounds = useSelector(boundsSelector);
  const zoom = useSelector(zoomSelector);
  const boundsStr = bounds ? JSON.stringify(bounds.toArray()) : '';
  return (
    <Paper className={classes.container}>
      <div>
        <TextField label="Boundaries" variant="standard" value={boundsStr} />
      </div>
      <div>
        <TextField
          label="Zoom"
          variant="standard"
          value={zoom ? zoom.toString() : ''}
        />
      </div>
    </Paper>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    container: {
      position: 'absolute',
      bottom: '130px',
      left: '16px',
      padding: '6px 16px',
      zIndex: theme.zIndex.modal,
      backgroundColor: theme.palette.primary.main,
    },
  });

export interface LocationBoxProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(LocationBox);
