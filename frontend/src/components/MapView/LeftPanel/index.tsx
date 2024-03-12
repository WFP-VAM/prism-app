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
import { LayerKey, PanelSize } from 'config/types';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import {
  AAlayerKey,
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

  React.useEffect(() => {
    if (AAAvailableDates) {
      dispatch(
        updateLayersCapabilities({
          ...serverAvailableDates,
          // TODO: queryDate here?
          [AAlayerKey]: AAAvailableDates,
        }),
      );
    }
    // we need serverAvailableDates to update them, but cannot have on the dependencies array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates, dispatch]);

  React.useEffect(() => {
    const selectedLayer = LayerDefinitions[AAlayerKey as LayerKey];
    if (!selectedLayer) {
      return;
    }
    const urlLayerKey = getUrlKey(selectedLayer);
    const AALayerInUrl = selectedLayers.find(x => x.id === selectedLayer.id);

    // TODO: update  Object.keys(AAData).length === 0 condition with something more solid
    // Move to AA tab when directly linked there
    if (
      tabValue !== Panel.AnticipatoryAction &&
      AALayerInUrl &&
      Object.keys(AAData).length === 0
    ) {
      dispatch(setTabValue(Panel.AnticipatoryAction));
      dispatch(loadAAData());
      return;
    }

    // Remove from url when leaving from AA tab
    if (tabValue !== Panel.AnticipatoryAction && tabValue !== Panel.None) {
      if (AALayerInUrl) {
        toggleRemoveLayer(
          selectedLayer,
          map,
          urlLayerKey,
          dispatch,
          removeLayerFromUrl,
        );
      }
      return;
    }

    dispatch(loadAAData());

    // Add to url when getting to AA tab
    if (AALayerInUrl) {
      return;
    }
    const updatedUrl = appendLayerToUrl(
      urlLayerKey,
      selectedLayers,
      selectedLayer,
    );
    updateHistory(urlLayerKey, updatedUrl);
    // url does not instantly update. updateHistory and appendLayerToUrl functions re-trigger useEffect, before selected layers is set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayers, tabValue, dispatch]);

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
      width: ({ panelSize }) =>
        panelSize !== PanelSize.folded ? PanelSize.medium : PanelSize.folded,
    },
  }),
);

export default LeftPanel;
