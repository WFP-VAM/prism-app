import {Paper,
  Theme,
  TextField} from '@mui/material';
import { useSelector } from 'context/hooks';
import { makeStyles, createStyles } from '@mui/styles';
import {
  boundsSelector,
  zoomSelector,
} from 'context/mapBoundaryInfoStateSlice';

function LocationBox() {
  const classes = useStyles();
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      position: 'absolute',
      bottom: '130px',
      left: '16px',
      padding: '6px 16px',
      zIndex: theme.zIndex.modal,
      backgroundColor: theme.palette.primary.main,
    },
  }),
);

export default LocationBox;
