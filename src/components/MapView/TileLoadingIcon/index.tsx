import React from 'react';
import { CircularProgress } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { loadingSelector } from '../../../context/mapTileLoadingStateSlice';

function TileLoadingIcon() {
  const loading = useSelector(loadingSelector);
  return (
    <div style={{ paddingTop: '0.3rem', paddingRight: '0.3rem' }}>
      {loading && <CircularProgress size="2rem" />}
    </div>
  );
}

export default TileLoadingIcon;
