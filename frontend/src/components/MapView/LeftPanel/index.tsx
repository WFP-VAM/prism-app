import { Drawer } from '@material-ui/core';
import React, { memo } from 'react';
import { PanelSize } from 'config/types';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import LeftPanelTabs from './LeftPanelTabs';
import TablesPanel from './TablesPanel';

const LeftPanel = memo(
  ({ panelSize, setPanelSize, isPanelHidden }: LeftPanelProps) => {
    const [
      resultsPage,
      setResultsPage,
    ] = React.useState<React.JSX.Element | null>(null);

    return (
      <Drawer
        PaperProps={{
          style: {
            width: panelSize,
            marginTop: 'calc(7vh + 1rem)',
            marginLeft: '1rem',
            height: '80vh',
            backgroundColor: '#F5F7F8',
            maxWidth: '100%',
            borderRadius: '8px',
          },
        }}
        variant="persistent"
        anchor="left"
        open={!isPanelHidden}
      >
        <LeftPanelTabs
          panelSize={panelSize}
          setPanelSize={setPanelSize}
          resultsPage={resultsPage}
          chartsPanel={
            <ChartsPanel
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
          analysisPanel={
            <AnalysisPanel
              panelSize={panelSize}
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
          tablesPanel={
            <TablesPanel
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
        />
      </Drawer>
    );
  },
);

interface LeftPanelProps {
  panelSize: PanelSize;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  isPanelHidden: boolean;
}

export default LeftPanel;
