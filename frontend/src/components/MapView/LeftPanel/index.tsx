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
  LayerDefinitions,
  areChartLayersAvailable,
  isAnticipatoryActionLayer,
} from 'config/utils';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
import {
  AAAvailableDatesSelector,
  AADataSelector,
  loadAAData,
} from 'context/anticipatoryActionStateSlice';
import { setSelectedBoundaries } from 'context/mapSelectionLayerStateSlice';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import { getAAAvailableDatesCombined } from 'utils/server-utils';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import TablesPanel from './TablesPanel';
import {
  AnticipatoryActionDroughtPanel,
  AnticipatoryActionStormPanel,
} from './AnticipatoryActionPanel';
import LayersPanel from './layersPanel';
import { areTablesAvailable, isAnticipatoryActionAvailable } from './utils';
import { toggleRemoveLayer } from './layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';
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
  const AAData = useSelector(AADataSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const AAAvailableDates = useSelector(AAAvailableDatesSelector);
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const { updateHistory, appendLayerToUrl, removeLayerFromUrl } =
    useUrlHistory();

  const classes = useStyles({ tabValue });

  const isPanelHidden = tabValue === Panel.None;

  // Sync serverAvailableDates with AAAvailableDates when the latter updates.
  React.useEffect(() => {
    if (AAAvailableDates) {
      const updatedCapabilities = AALayerIds.reduce(
        (acc, layerId) => ({
          ...acc,
          [layerId]: getAAAvailableDatesCombined(AAAvailableDates),
        }),
        { ...serverAvailableDates },
      );
      dispatch(updateLayersCapabilities(updatedCapabilities));
    }
    // To avoid an infinite loop, we only want to run this effect when AAAvailableDates changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates, dispatch]);

  const AALayerInUrl = React.useMemo(
    () =>
      selectedLayers.find(x => AALayerIds.includes(x.id as AnticipatoryAction)),
    [selectedLayers],
  );

  // navigate to AA tab when app originally load with AA layer in url
  React.useEffect(() => {
    // TODO: update  Object.keys(AAData).length === 0 condition with something more solid
    // Move to AA tab when directly linked there
    if (
      !isAnticipatoryActionLayer(tabValue) &&
      AALayerInUrl !== undefined &&
      Object.keys(AAData['Window 1']).length === 0
    ) {
      if (AALayerInUrl.id === AnticipatoryAction.drought) {
        dispatch(setTabValue(Panel.AnticipatoryActionDrought));
      } else if (AALayerInUrl.id === AnticipatoryAction.storm) {
        dispatch(setTabValue(Panel.AnticipatoryActionStorm));
      }
    }
  }, [AAData, AALayerInUrl, dispatch, tabValue]);

  // Remove from url when leaving from AA tab
  React.useEffect(() => {
    if (
      !isAnticipatoryActionLayer(tabValue) &&
      tabValue !== Panel.None &&
      AALayerInUrl !== undefined &&
      Object.keys(AAData['Window 1']).length !== 0
    ) {
      toggleRemoveLayer(
        AALayerInUrl,
        map,
        getUrlKey(AALayerInUrl),
        dispatch,
        removeLayerFromUrl,
      );
    }
  }, [AAData, AALayerInUrl, dispatch, map, removeLayerFromUrl, tabValue]);

  // fetch csv data when loading AA page
  React.useEffect(() => {
    if (!isAnticipatoryActionLayer(tabValue)) {
      return;
    }
    dispatch(loadAAData());
  }, [dispatch, tabValue]);

  // Add or switch AA layers in url
  React.useEffect(() => {
    if (!isAnticipatoryActionLayer(tabValue)) {
      return;
    }
    const selectedLayerId = AALayerIds.find(x => x === tabValue);
    if (!selectedLayerId) {
      return;
    }

    const layer = LayerDefinitions[selectedLayerId];
    if (!layer || AALayerInUrl?.id === layer.id) {
      return;
    }

    if (AALayerInUrl) {
      toggleRemoveLayer(
        AALayerInUrl,
        map,
        getUrlKey(AALayerInUrl),
        dispatch,
        removeLayerFromUrl,
      );
    }

    const updatedUrl = appendLayerToUrl(
      getUrlKey(layer),
      selectedLayers,
      layer,
    );

    updateHistory(getUrlKey(layer), updatedUrl);
    // url does not instantly update. updateHistory and appendLayerToUrl functions re-trigger useEffect, before selected layers is set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayers, tabValue, dispatch, AALayerInUrl]);

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
    if (!isAnticipatoryActionAvailable) {
      return null;
    }
    if (tabValue === Panel.AnticipatoryActionDrought) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionDrought}>
          <AnticipatoryActionDroughtPanel />
        </TabPanel>
      );
    }
    if (tabValue === Panel.AnticipatoryActionStorm) {
      return (
        <TabPanel value={tabValue} index={Panel.AnticipatoryActionStorm}>
          <AnticipatoryActionStormPanel />
        </TabPanel>
      );
    }
    return null;
  }, [tabValue]);

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
