import { createStyles, Drawer, makeStyles, Theme } from '@material-ui/core';
import React from 'react';
import { PanelSize } from '../../../config/types';
import { Extent } from '../Layers/raster-utils';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import LayersPanel from './layersPanel';
import LeftPanelTabs from './LeftPanelTabs';

interface StyleProps {
  panelSize: PanelSize;
}

const useStyles = makeStyles<Theme, StyleProps>(() =>
  createStyles({
    paper: {
      marginTop: '7vh',
      height: '93%',
      width: ({ panelSize }) => panelSize,
      backgroundColor: '#F5F7F8',
    },
  }),
);

function LeftPanel({
  extent,
  panelSize,
  setPanelSize,
  isPanelHidden,
}: LeftPanelProps) {
  const classes = useStyles({ panelSize });
  const [resultsPage, setResultsPage] = React.useState<JSX.Element | null>(
    null,
  );

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={!isPanelHidden}
      classes={{ paper: classes.paper }}
    >
      <LeftPanelTabs
        panelSize={panelSize}
        setPanelSize={setPanelSize}
        resultsPage={resultsPage}
        layersPanel={<LayersPanel extent={extent} />}
        chartsPanel={
          <ChartsPanel
            setPanelSize={setPanelSize}
            setResultsPage={setResultsPage}
          />
        }
        analysisPanel={
          <AnalysisPanel
            extent={extent}
            panelSize={panelSize}
            setPanelSize={setPanelSize}
            setResultsPage={setResultsPage}
          />
        }
      />
    </Drawer>
  );
}

interface LeftPanelProps {
  extent?: Extent;
  panelSize: PanelSize;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  isPanelHidden: boolean;
}

export default LeftPanel;
