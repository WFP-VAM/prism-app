import React from 'react';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { LayerKey } from '../../../config/types';
import { loadingLayerIdsSelector } from '../../../context/mapTileLoadingStateSlice';

function TileLoadingIcon({ classes, layerId }: LoadingBarProps) {
  const loadingLayerIds = useSelector(loadingLayerIdsSelector);
  const loading = loadingLayerIds.includes(layerId);
  return (
    <div className={classes.container}>
      <div className={classes.lineBase} />
      {loading && <div className={classes.line} />}
    </div>
  );
}

const styles = () =>
  createStyles({
    container: {
      position: 'relative',
      paddingTop: '3px',
      paddingBottom: '3px',
    },
    lineBase: {
      height: '2px',
      width: '180px',
      backgroundColor: 'rgba(0, 0, 0, 0.12)',
      borderRadius: '25px',
      position: 'absolute',
      top: '0px',
      left: '0px',
    },

    line: {
      height: '2px',
      width: '36px',
      backgroundColor: '#5A686C',
      borderRadius: '25px',
      position: 'absolute',
      top: '0px',
      left: '0px',
      animation: '$slide 2.5s infinite',
    },

    '@keyframes slide': {
      '0%': {
        transform: 'translateX(0px)',
        width: '36px',
      },

      '50%': {
        transform: 'translateX(130px)',
        width: '50px',
      },

      '100%': {
        transform: 'translateX(0px)',
        width: '36px',
      },
    },
  });

export interface LoadingBarProps extends WithStyles<typeof styles> {
  layerId: LayerKey;
}

export default withStyles(styles)(TileLoadingIcon);
