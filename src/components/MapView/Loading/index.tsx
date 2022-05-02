import React, { useState, useEffect } from 'react';
import {
  CircularProgress,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import { isLoading as isTileLoading } from '../../../context/mapTileLoadingStateSlice';
import { isLoading as isLayerLoading } from '../../../context/mapStateSlice/selectors';
import { isLoading as areDatesLoading } from '../../../context/serverStateSlice';

function Loading({ classes }: MapViewProps) {
  const tilesLoading = useSelector(isTileLoading);
  const layersLoading = useSelector(isLayerLoading);
  const datesLoading = useSelector(areDatesLoading);
  const loading = tilesLoading || layersLoading || datesLoading;
  const [show, setShow] = useState(false);
  const [waitAnimation, setWaitAnimation] = useState(true);

  useEffect(() => {
    if(loading) {
      // setWaitAnimation(false);
      setShow(true);
    } else {
      setShow(false);
      setWaitAnimation(true);
      setTimeout(() => {
        // setWaitAnimation(false)
      }, 1000);
    }
  }, [loading, show, waitAnimation]);

  return (
    <>
      {(loading || waitAnimation) && (
        <div className={`${classes.loading} ${show ? classes.show:''}`}>
          <CircularProgress size={100} />
        </div>
      )}
    </>
  );
}

const styles = () =>
  createStyles({
    container: {
      height: '100%',
      position: 'relative',
    },
    loading: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      backgroundColor: 'black',
      transition: 'all 0.5s ease',
      opacity: 0,
      zIndex: 1,
      pointerEvents: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    show: {
      opacity: 0.65
    }
  });

export interface MapViewProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Loading);
