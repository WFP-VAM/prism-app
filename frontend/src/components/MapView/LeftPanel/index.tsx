import { Drawer, Theme, createStyles, makeStyles } from '@material-ui/core';
import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Panel,
  leftPanelSizeSelector,
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { LayerDefinitions, areChartLayersAvailable } from 'config/utils';
import { LayerType, PanelSize } from 'config/types';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import {
  AnticipatoryActionAvailableDatesSelector,
  AnticipatoryActionDataSelector,
  loadAAData,
} from 'context/anticipatoryActionStateSlice';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
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
      {index === value && children}
    </div>
  );
});

const AALayers: LayerType[] = Object.values(LayerDefinitions).filter(
  layer => layer.type === 'anticipatory_action',
);

const LeftPanel = memo(() => {
  const dispatch = useDispatch();
  const tabValue = useSelector(leftPanelTabValueSelector);
  const panelSize = useSelector(leftPanelSizeSelector);
  const AAData = useSelector(AnticipatoryActionDataSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const AAAvailableDates = useSelector(
    AnticipatoryActionAvailableDatesSelector,
  );
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const {
    updateHistory,
    appendLayerToUrl,
    removeLayerFromUrl,
  } = useUrlHistory();

  const classes = useStyles({ panelSize, tabValue });

  const isPanelHidden = tabValue === Panel.None;
  const [
    resultsPage,
    setResultsPage,
  ] = React.useState<React.JSX.Element | null>(null);

  // Sync serverAvailableDates with AAAvailableDates when the latter updates.
  React.useEffect(() => {
    if (AAAvailableDates) {
      dispatch(
        updateLayersCapabilities({
          ...serverAvailableDates,
          ...AAAvailableDates,
        }),
      );
    }
    // To avoid an infinite loop, we only want to run this effect when AAAvailableDates changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates, dispatch]);

  const AALayersInUrl = React.useMemo(
    () => selectedLayers.filter(x => AALayers.find(y => y.id === x.id)),
    [selectedLayers],
  );

  // navigate to AA tab when app originally load with AA layer in url
  React.useEffect(() => {
    if (!AALayers) {
      return;
    }

    // TODO: update  Object.keys(AAData).length === 0 condition with something more solid
    // Move to AA tab when directly linked there
    if (
      tabValue !== Panel.AnticipatoryAction &&
      AALayersInUrl.length > 0 &&
      Object.keys(AAData['Window 1']).length === 0
    ) {
      dispatch(setTabValue(Panel.AnticipatoryAction));
    }
  }, [AAData, AALayersInUrl, dispatch, tabValue]);

  // Remove from url when leaving from AA tab
  React.useEffect(() => {
    if (
      tabValue !== Panel.AnticipatoryAction &&
      tabValue !== Panel.None &&
      AALayersInUrl.length > 0 &&
      Object.keys(AAData['Window 1']).length !== 0
    ) {
      AALayers.forEach(x =>
        toggleRemoveLayer(x, map, getUrlKey(x), dispatch, removeLayerFromUrl),
      );
    }
  }, [AAData, AALayersInUrl, dispatch, map, removeLayerFromUrl, tabValue]);

  // fetch csv data when loading AA page
  React.useEffect(() => {
    if (tabValue !== Panel.AnticipatoryAction) {
      return;
    }
    dispatch(loadAAData());
  }, [dispatch, tabValue]);

  // Add layers to url
  React.useEffect(() => {
    if (!AALayers || tabValue !== Panel.AnticipatoryAction) {
      return;
    }

    const layer = AALayers.find(x => !AALayersInUrl.find(y => y.id === x.id));

    // Add to url when getting to AA tab
    if (AALayersInUrl.length === AALayers.length || !layer) {
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
  }, [selectedLayers, tabValue, dispatch, AALayersInUrl]);

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
      width: ({ panelSize }) => panelSize,
    },
  }),
);

export default LeftPanel;
