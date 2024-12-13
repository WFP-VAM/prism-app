import { Drawer, Theme, createStyles, makeStyles } from '@material-ui/core';
import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { AnticipatoryAction, Panel } from 'config/types';
import {
  AALayerIds,
  areChartLayersAvailable,
  isAnticipatoryActionLayer,
} from 'config/utils';
import { setSelectedBoundaries } from 'context/mapSelectionLayerStateSlice';
import { layersSelector } from 'context/mapStateSlice/selectors';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import TablesPanel from './TablesPanel';
import {
  AnticipatoryActionDroughtPanel,
  AnticipatoryActionStormPanel,
} from './AnticipatoryActionPanel';
import LayersPanel from './layersPanel';
import {
  areTablesAvailable,
  isAnticipatoryActionDroughtAvailable,
  isAnticipatoryActionStormAvailable,
} from './utils';
import AlertsPanel from './AlertsPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: Panel;
  value: Panel;
}

const TabPanel = memo(({ children, value, index, ...other }: TabPanelProps) => (
  <div
    role="tabpanel"
    id={`full-width-tabpanel-${index}`}
    aria-labelledby={`full-width-tab-${index}`}
    style={{
      display: index === value ? 'block' : 'none',
      flexGrow: 1,
      height: 'calc(94vh - 48px)',
      order: index === value ? -1 : undefined,
      overflowX: index === value ? 'hidden' : 'auto',
    }}
    {...other}
  >
    {children}
  </div>
));

const LeftPanel = memo(() => {
  const dispatch = useDispatch();
  const tabValue = useSelector(leftPanelTabValueSelector);
  const selectedLayers = useSelector(layersSelector);

  const AALayerInUrl = selectedLayers.find(x =>
    AALayerIds.includes(x.id as AnticipatoryAction),
  );

  const classes = useStyles({ tabValue });

  const isPanelHidden = tabValue === Panel.None;

  const renderedChartsPanel = React.useMemo(() => {
    if (!areChartLayersAvailable) {
      return null;
    }
    return (
      <TabPanel value={tabValue} index={Panel.Charts}>
        <ChartsPanel />
      </TabPanel>
    );
  }, [tabValue]);

  const renderedTablesPanel = React.useMemo(() => {
    if (!areTablesAvailable) {
      return null;
    }
    return (
      <TabPanel value={tabValue} index={Panel.Tables}>
        <TablesPanel />
      </TabPanel>
    );
  }, [tabValue]);

  const renderAlertsPanel = React.useMemo(
    () => (
      <TabPanel value={tabValue} index={Panel.Alerts}>
        {tabValue === Panel.Alerts && <AlertsPanel />}
      </TabPanel>
    ),
    [tabValue],
  );

  // Reset selected boundaries when tab changes from Alerts
  React.useEffect(() => {
    if (tabValue !== Panel.Alerts) {
      dispatch(setSelectedBoundaries([]));
    }
  }, [tabValue, dispatch]);

  const renderedAnticipatoryActionPanel = React.useMemo(() => {
    const shouldLoadAAPanel =
      !isAnticipatoryActionLayer(tabValue) && AALayerInUrl !== undefined;

    if (shouldLoadAAPanel) {
      if (AALayerInUrl.id === Panel.AnticipatoryActionDrought) {
        dispatch(setTabValue(Panel.AnticipatoryActionDrought));
      } else if (AALayerInUrl.id === AnticipatoryAction.storm) {
        dispatch(setTabValue(Panel.AnticipatoryActionStorm));
      }
    }

    if (
      isAnticipatoryActionDroughtAvailable &&
      tabValue === Panel.AnticipatoryActionDrought
    ) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionDrought}>
          <AnticipatoryActionDroughtPanel />
        </TabPanel>
      );
    }
    if (
      isAnticipatoryActionStormAvailable &&
      (tabValue === Panel.AnticipatoryActionStorm || shouldLoadAAPanel)
    ) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionStorm}>
          <AnticipatoryActionStormPanel />
        </TabPanel>
      );
    }
    return null;
  }, [tabValue, AALayerInUrl, dispatch]);

  return (
    <Drawer
      PaperProps={{
        elevation: 1,
        style: {
          marginTop: '6vh',
          height: tabValue === Panel.Charts ? '94vh' : '80vh',
          backgroundColor: 'white',
          maxWidth: '100%',
          borderRadius: '0 8px 8px 8px',
        },
      }}
      variant="persistent"
      anchor="left"
      open={!isPanelHidden}
    >
      <div className={classes.root}>
        <div className={classes.tabsWrapper}>
          <TabPanel value={tabValue} index={Panel.Layers}>
            <LayersPanel />
          </TabPanel>
          {renderedChartsPanel}
          <TabPanel value={tabValue} index={Panel.Analysis}>
            <AnalysisPanel />
          </TabPanel>
          {renderedTablesPanel}
          {renderAlertsPanel}
          {renderedAnticipatoryActionPanel}
          {/* Empty panel to remove warnings */}
          <TabPanel value={tabValue} index={Panel.None} />
        </div>
      </div>
    </Drawer>
  );
});

interface StyleProps {
  tabValue: Panel;
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
    },
  }),
);

export default LeftPanel;
