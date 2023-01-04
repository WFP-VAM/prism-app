import { createStyles, Drawer, makeStyles, Theme } from '@material-ui/core';
import React, { useState } from 'react';
import LayersPanel from './layersPanel';
import { Extent } from '../Layers/raster-utils';
import AnalysisPanel from './AnalysisPanel';
import LeftPanelTabs from './LeftPanelTabs';
import ChartsPanel from './ChartsPanel';

interface StyleProps {
  isPanelExtended: boolean;
}

const useStyles = makeStyles<Theme, StyleProps>(() =>
  createStyles({
    paper: {
      marginTop: '7vh',
      height: '93%',
      width: ({ isPanelExtended }) => (isPanelExtended ? '60%' : '30%'),
      backgroundColor: '#F5F7F8',
    },
  }),
);

function LeftPanel({ extent }: LeftPanelProps) {
  const [isPanelExtended, setIsPanelExtended] = useState(false);
  const classes = useStyles({ isPanelExtended });
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open
      classes={{ paper: classes.paper }}
    >
      <LeftPanelTabs
        isPanelExtended={isPanelExtended}
        setIsPanelExtended={setIsPanelExtended}
        layersPanel={<LayersPanel extent={extent} />}
        chartsPanel={<ChartsPanel />}
        analysisPanel={
          <AnalysisPanel
            extent={extent}
            isPanelExtended={isPanelExtended}
            setIsPanelExtended={setIsPanelExtended}
          />
        }
      />
    </Drawer>
  );
}

interface LeftPanelProps {
  extent?: Extent;
}

export default LeftPanel;
