import { Drawer, Theme, createStyles, makeStyles } from '@material-ui/core';
import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Panel,
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import {
  AALayerId,
  LayerDefinitions,
  areChartLayersAvailable,
} from 'config/utils';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
import {
  AAAvailableDatesSelector,
  AADataSelector,
  loadAAData,
} from 'context/anticipatoryActionStateSlice';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import { getAAAvailableDatesCombined } from 'utils/server-utils';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import TablesPanel from './TablesPanel';
import AnticipatoryActionPanel from './AnticipatoryActionPanel';
import LayersPanel from './layersPanel';
import { areTablesAvailable, isAnticipatoryActionAvailable } from './utils';
import { toggleRemoveLayer } from './layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';

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
        height: 'calc(94vh - 48px)',
        order: index === value ? -1 : undefined,
        overflowX: index === value ? 'hidden' : 'auto',
      }}
      {...other}
    >
      {children}
    </div>
  );
});

const LeftPanel = memo(() => {
  const dispatch = useDispatch();
  const tabValue = useSelector(leftPanelTabValueSelector);
  const AAData = useSelector(AADataSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const AAAvailableDates = useSelector(AAAvailableDatesSelector);
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const {
    updateHistory,
    appendLayerToUrl,
    removeLayerFromUrl,
  } = useUrlHistory();

  const classes = useStyles({ tabValue });

  const isPanelHidden = tabValue === Panel.None;

  // Sync serverAvailableDates with AAAvailableDates when the latter updates.
  React.useEffect(() => {
    if (AAAvailableDates) {
      dispatch(
        updateLayersCapabilities({
          ...serverAvailableDates,
          [AALayerId]: getAAAvailableDatesCombined(AAAvailableDates),
        }),
      );
    }
    // To avoid an infinite loop, we only want to run this effect when AAAvailableDates changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates, dispatch]);

  const AALayerInUrl = React.useMemo(
    () => selectedLayers.find(x => x.id === AALayerId),
    [selectedLayers],
  );

  // navigate to AA tab when app originally load with AA layer in url
  React.useEffect(() => {
    // TODO: update  Object.keys(AAData).length === 0 condition with something more solid
    // Move to AA tab when directly linked there
    if (
      tabValue !== Panel.AnticipatoryAction &&
      AALayerInUrl !== undefined &&
      Object.keys(AAData['Window 1']).length === 0
    ) {
      dispatch(setTabValue(Panel.AnticipatoryAction));
    }
  }, [AAData, AALayerInUrl, dispatch, tabValue]);

  // Remove from url when leaving from AA tab
  React.useEffect(() => {
    if (
      tabValue !== Panel.AnticipatoryAction &&
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
    if (tabValue !== Panel.AnticipatoryAction) {
      return;
    }
    dispatch(loadAAData());
  }, [dispatch, tabValue]);

  // Add layers to url
  React.useEffect(() => {
    if (tabValue !== Panel.AnticipatoryAction) {
      return;
    }

    const layer = LayerDefinitions[AALayerId];

    // Add to url when getting to AA tab
    if (AALayerInUrl !== undefined || !layer) {
      return;
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
