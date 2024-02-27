import { createStyles, makeStyles, Theme } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PanelSize } from 'config/types';
import { leftPanelTabValueSelector, Panel } from 'context/leftPanelStateSlice';
import { areChartLayersAvailable } from 'config/utils';
import TabPanel from './TabPanel';
import LayersPanel from '../layersPanel';
import { areTablesAvailable } from '../utils';

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

interface TabsProps {
  chartsPanel: React.ReactNode;
  analysisPanel: React.ReactNode;
  tablesPanel: React.ReactNode;
  panelSize: PanelSize;
  resultsPage: React.JSX.Element | null;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
}

const LeftPanelTabs = memo(
  ({
    chartsPanel,
    analysisPanel,
    tablesPanel,
    panelSize,
    resultsPage,
    setPanelSize,
  }: TabsProps) => {
    const tabValue = useSelector(leftPanelTabValueSelector);
    const classes = useStyles({ panelSize, tabValue });

    const renderedChartsPanel = useMemo(() => {
      if (!areChartLayersAvailable) {
        return null;
      }
      return (
        <TabPanel value={tabValue} index={Panel.Charts}>
          {chartsPanel}
        </TabPanel>
      );
    }, [chartsPanel, tabValue]);

    const renderedTablesPanel = useMemo(() => {
      if (!areTablesAvailable) {
        return null;
      }
      return (
        <TabPanel value={tabValue} index={Panel.Tables}>
          {tablesPanel}
        </TabPanel>
      );
    }, [tabValue, tablesPanel]);

    return (
      <div className={classes.root}>
        <div className={classes.tabsWrapper}>
          <TabPanel value={tabValue} index={Panel.Layers}>
            <LayersPanel />
          </TabPanel>
          {renderedChartsPanel}
          <TabPanel value={tabValue} index={Panel.Analysis}>
            {analysisPanel}
          </TabPanel>
          {renderedTablesPanel}
          {/* Empty panel to remove warnings */}
          <TabPanel value={tabValue} index={Panel.None} />
        </div>
        {resultsPage}
      </div>
    );
  },
);

export default LeftPanelTabs;
