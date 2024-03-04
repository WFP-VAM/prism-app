import { Drawer, Theme, createStyles, makeStyles } from '@material-ui/core';
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import {
  Panel,
  leftPanelSizeSelector,
  leftPanelTabValueSelector,
} from 'context/leftPanelStateSlice';
import { areChartLayersAvailable } from 'config/utils';
import { PanelSize } from 'config/types';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import TablesPanel from './TablesPanel';
import AnticipatoryActionPanel from './AnticipatoryActionPanel';
import LayersPanel from './layersPanel';
import { areTablesAvailable, isAnticipatoryActionAvailable } from './utils';

interface TabPanelProps {
  children?: React.ReactNode;
  index: Panel;
  value: Panel;
}

const TabPanel = memo(({ children, value, index, ...other }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      style={{
        display: index === value ? 'block' : 'none',
        flexGrow: 1,
        height: 'calc(93vh - 48px)',
        order: index === value ? -1 : undefined,
        overflowX: index === value ? 'hidden' : 'auto',
      }}
      {...other}
    >
      {index === value && children}
    </div>
  );
});

const LeftPanel = memo(() => {
  const tabValue = useSelector(leftPanelTabValueSelector);
  const panelSize = useSelector(leftPanelSizeSelector);

  const classes = useStyles({ panelSize, tabValue });

  const isPanelHidden = tabValue === Panel.None;
  const [
    resultsPage,
    setResultsPage,
  ] = React.useState<React.JSX.Element | null>(null);

  const renderedChartsPanel = React.useMemo(() => {
    if (!areChartLayersAvailable) {
      return null;
    }
    return (
      <TabPanel value={tabValue} index={Panel.Charts}>
        <ChartsPanel setResultsPage={setResultsPage} />
      </TabPanel>
    );
  }, [tabValue]);

  const renderedTablesPanel = React.useMemo(() => {
    if (!areTablesAvailable) {
      return null;
    }
    return (
      <TabPanel value={tabValue} index={Panel.Tables}>
        <TablesPanel setResultsPage={setResultsPage} />
      </TabPanel>
    );
  }, [tabValue]);

  const renderedAnticipatoryActionPanel = React.useMemo(() => {
    if (!isAnticipatoryActionAvailable) {
      return null;
    }
    return (
      <TabPanel value={tabValue} index={Panel.AnticipatoryAction}>
        <AnticipatoryActionPanel />
      </TabPanel>
    );
  }, [tabValue]);

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
      <div className={classes.root}>
        <div className={classes.tabsWrapper}>
          <TabPanel value={tabValue} index={Panel.Layers}>
            <LayersPanel setResultsPage={setResultsPage} />
          </TabPanel>
          {renderedChartsPanel}
          <TabPanel value={tabValue} index={Panel.Analysis}>
            <AnalysisPanel setResultsPage={setResultsPage} />
          </TabPanel>
          {renderedTablesPanel}
          {renderedAnticipatoryActionPanel}
          {/* Empty panel to remove warnings */}
          <TabPanel value={tabValue} index={Panel.None} />
        </div>
        {resultsPage}
      </div>
    </Drawer>
  );
});

interface StyleProps {
  tabValue: Panel;
  panelSize: PanelSize;
}

const useStyles = makeStyles<Theme, StyleProps>(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      overflowX: 'hidden',
      overflowY: ({ tabValue }) =>
        tabValue === Panel.Charts || tabValue === Panel.Tables
          ? 'hidden'
          : 'auto',
    },
    tabsWrapper: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      order: -2,
      width: ({ panelSize }) =>
        panelSize !== PanelSize.folded ? PanelSize.medium : PanelSize.folded,
    },
  }),
);

export default LeftPanel;
