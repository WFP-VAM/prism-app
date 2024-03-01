import { Drawer } from '@material-ui/core';
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import {
  Panel,
  leftPanelSizeSelector,
  leftPanelTabValueSelector,
} from 'context/leftPanelStateSlice';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import LeftPanelTabs from './LeftPanelTabs';
import TablesPanel from './TablesPanel';
import AnticipatoryActionPanel from './AnticipatoryActionPanel';

const LeftPanel = memo(() => {
  const tabValue = useSelector(leftPanelTabValueSelector);
  const panelSize = useSelector(leftPanelSizeSelector);

  const isPanelHidden = tabValue === Panel.None;
  const [
    resultsPage,
    setResultsPage,
  ] = React.useState<React.JSX.Element | null>(null);

  return (
    <Drawer
      PaperProps={{
        elevation: 1,
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
        resultsPage={resultsPage}
        chartsPanel={<ChartsPanel setResultsPage={setResultsPage} />}
        analysisPanel={<AnalysisPanel setResultsPage={setResultsPage} />}
        tablesPanel={<TablesPanel setResultsPage={setResultsPage} />}
        anticipatoryActionPanel={<AnticipatoryActionPanel />}
      />
    </Drawer>
  );
});

export default LeftPanel;
