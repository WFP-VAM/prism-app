import {
  CircularProgress,
  createStyles,
  Drawer,
  makeStyles,
} from '@material-ui/core';
import React from 'react';
import LayersPanel from './layersPanel';
import { Extent } from '../Layers/raster-utils';
import AnalysisPanel from './AnalysisPanel';
import LeftPanelTabs from './LeftPanelTabs';

const useStyles = makeStyles(() =>
  createStyles({
    paper: {
      marginTop: '7vh',
      width: '30%',
      backgroundColor: '#F5F7F8',
    },
  }),
);

function LeftPanel({ extent }: LeftPanelProps) {
  const classes = useStyles();
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open
      classes={{ paper: classes.paper }}
    >
      <LeftPanelTabs
        layersPanel={<LayersPanel />}
        chartsPanel={<CircularProgress />}
        analysisPanel={<AnalysisPanel extent={extent} />}
      />
    </Drawer>
  );
}

interface LeftPanelProps {
  extent?: Extent;
}

export default LeftPanel;
