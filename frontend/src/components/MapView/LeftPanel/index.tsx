import { Box, Drawer } from '@mui/material';
import { AnticipatoryAction, Panel } from 'config/types';
import {
  AALayerIds,
  areChartLayersAvailable,
  isAnticipatoryActionLayer,
} from 'config/utils';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { setSelectedBoundaries } from 'context/mapSelectionLayerStateSlice';
import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { useMapState } from 'utils/useMapState';

import AlertsPanel from './AlertsPanel';
import AnalysisPanel from './AnalysisPanel';
import {
  AnticipatoryActionDroughtPanel,
  AnticipatoryActionStormPanel,
} from './AnticipatoryActionPanel';
import AnticipatoryActionFloodPanel from './AnticipatoryActionPanel/AnticipatoryActionFloodPanel';
import ChartsPanel from './ChartsPanel';
import LayersPanel from './layersPanel';
import { toggleRemoveLayer } from './layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';
import { leftPanelRootSx, tabsWrapperSx } from './leftPanelStyles';
import TablesPanel from './TablesPanel';
import {
  areTablesAvailable,
  isAnticipatoryActionDroughtAvailable,
  isAnticipatoryActionFloodAvailable,
  isAnticipatoryActionStormAvailable,
} from './utils';

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
      height: 'calc(100vh - 56px - 48px)',
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
  const {
    actions: { addLayer, removeLayer },
    ...mapState
  } = useMapState();
  const selectedLayers = mapState.layers;
  const map = mapState.maplibreMap();
  const { removeLayerFromUrl } = useUrlHistory();

  const AALayerInUrl = selectedLayers.find(x =>
    AALayerIds.includes(x.id as AnticipatoryAction),
  );

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

  // Remove from url when leaving from AA tab
  React.useEffect(() => {
    if (
      !isAnticipatoryActionLayer(tabValue) &&
      tabValue !== Panel.None &&
      AALayerInUrl !== undefined
    ) {
      toggleRemoveLayer(
        AALayerInUrl,
        map,
        getUrlKey(AALayerInUrl),
        removeLayer,
        removeLayerFromUrl,
        addLayer,
      );
    }
  }, [tabValue]);

  // Reset selected boundaries when tab changes from Alerts
  React.useEffect(() => {
    if (tabValue !== Panel.Alerts) {
      dispatch(setSelectedBoundaries([]));
    }
  }, [tabValue, dispatch]);

  // Redirect to the correct Anticipatory Action tab when loading AA layer from url
  React.useEffect(() => {
    if (!isAnticipatoryActionLayer(tabValue) && AALayerInUrl) {
      if (AALayerInUrl.id === AnticipatoryAction.drought) {
        dispatch(setTabValue(Panel.AnticipatoryActionDrought));
      } else if (AALayerInUrl.id === AnticipatoryAction.storm) {
        dispatch(setTabValue(Panel.AnticipatoryActionStorm));
      } else if (AALayerInUrl.id === AnticipatoryAction.flood) {
        dispatch(setTabValue(Panel.AnticipatoryActionFlood));
      }
    }
  }, [AALayerInUrl]);

  const renderedAnticipatoryActionPanel = React.useMemo(() => {
    const shouldLoadAAPanel = tabValue && isAnticipatoryActionLayer(tabValue);

    if (
      isAnticipatoryActionDroughtAvailable &&
      tabValue === Panel.AnticipatoryActionDrought &&
      shouldLoadAAPanel
    ) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionDrought}>
          <AnticipatoryActionDroughtPanel />
        </TabPanel>
      );
    }
    if (
      isAnticipatoryActionStormAvailable &&
      tabValue === Panel.AnticipatoryActionStorm &&
      shouldLoadAAPanel
    ) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionStorm}>
          <AnticipatoryActionStormPanel />
        </TabPanel>
      );
    }
    if (
      isAnticipatoryActionFloodAvailable &&
      tabValue === Panel.AnticipatoryActionFlood &&
      shouldLoadAAPanel
    ) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionFlood}>
          <AnticipatoryActionFloodPanel />
        </TabPanel>
      );
    }
    return null;
  }, [tabValue]);

  return (
    <Drawer
      slotProps={{
        paper: {
          elevation: 1,
          style: {
            marginTop: '56px',
            height: tabValue === Panel.Charts ? 'calc(100vh - 56px)' : '80vh',
            backgroundColor: 'white',
            maxWidth: '100%',
            borderRadius: '0 8px 8px 8px',
          },
        },
      }}
      variant="persistent"
      anchor="left"
      open={!isPanelHidden}
    >
      <Box sx={leftPanelRootSx(tabValue)}>
        <Box sx={tabsWrapperSx}>
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
        </Box>
      </Box>
    </Drawer>
  );
});

export default LeftPanel;
