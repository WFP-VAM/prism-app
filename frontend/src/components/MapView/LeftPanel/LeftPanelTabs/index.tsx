import {
  Box,
  createStyles,
  makeStyles,
  Tab,
  Tabs,
  Theme,
} from '@material-ui/core';
import { BarChartOutlined, TableChart } from '@material-ui/icons';
import React, { memo, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sum } from 'lodash';
import { PanelSize } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import {
  leftPanelTabValueSelector,
  Panel,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { useSafeTranslation } from 'i18n';
import TabPanel from './TabPanel';
import LayersPanel from '../layersPanel';

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
    },
    tabsContainer: {
      visibility: 'collapse',
      order: -2,
      width: ({ panelSize }) =>
        panelSize !== PanelSize.folded ? PanelSize.medium : PanelSize.folded,
    },
    tabRoot: {
      textTransform: 'none',
      minWidth: 50,
      maxWidth: '50%',
    },
    tabSelected: {
      opacity: 1,
      backgroundColor: '#3C3F40',
    },
  }),
);

interface TabsProps {
  chartsPanel: React.ReactNode;
  analysisPanel: React.ReactNode;
  tablesPanel: React.ReactNode;
  areTablesAvailable: boolean;
  panelSize: PanelSize;
  resultsPage: React.JSX.Element | null;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
}

const LeftPanelTabs = memo(
  ({
    chartsPanel,
    analysisPanel,
    tablesPanel,
    areTablesAvailable,
    panelSize,
    resultsPage,
    setPanelSize,
  }: TabsProps) => {
    const { t } = useSafeTranslation();
    const dispatch = useDispatch();
    const tabValue = useSelector(leftPanelTabValueSelector);
    const classes = useStyles({ panelSize, tabValue });

    const areChartLayersAvailable = useMemo(() => {
      return getWMSLayersWithChart().length > 0;
    }, []);

    const handleChange = useCallback(
      (_: any, newValue: Panel) => {
        setPanelSize(PanelSize.medium);
        dispatch(setTabValue(newValue));
      },
      [dispatch, setPanelSize],
    );

    const a11yProps = useCallback((index: Panel) => {
      return {
        id: `full-width-tab-${index}`,
        'aria-controls': `full-width-tabpanel-${index}`,
      };
    }, []);

    const renderedTabWidth = useMemo(() => {
      const nTabs = 2 + sum([areChartLayersAvailable, areTablesAvailable]);
      return `calc(100% / ${nTabs})`;
    }, [areChartLayersAvailable, areTablesAvailable]);

    const renderedChartsPanel = useMemo(() => {
      if (!areChartLayersAvailable) {
        return null;
      }
      return (
        <TabPanel value={tabValue} index={Panel.Charts}>
          {chartsPanel}
        </TabPanel>
      );
    }, [areChartLayersAvailable, chartsPanel, tabValue]);

    const renderedTablesPanel = useMemo(() => {
      if (!areTablesAvailable) {
        return null;
      }
      return (
        <TabPanel value={tabValue} index={Panel.Tables}>
          {tablesPanel}
        </TabPanel>
      );
    }, [areTablesAvailable, tabValue, tablesPanel]);

    const renderedChartsTab = useMemo(() => {
      if (!areChartLayersAvailable) {
        return null;
      }
      return (
        <Tab
          classes={{
            root: classes.tabRoot,
            selected: classes.tabSelected,
          }}
          style={{
            width: renderedTabWidth,
          }}
          value={Panel.Charts}
          disableRipple
          label={
            <Box display="flex">
              <BarChartOutlined style={{ verticalAlign: 'middle' }} />
              <Box ml={1}>{t('Charts')}</Box>
            </Box>
          }
          {...a11yProps(Panel.Charts)}
        />
      );
    }, [
      a11yProps,
      areChartLayersAvailable,
      classes.tabRoot,
      classes.tabSelected,
      renderedTabWidth,
      t,
    ]);

    const renderedTablesTab = useMemo(() => {
      if (!areTablesAvailable) {
        return null;
      }
      return (
        <Tab
          classes={{
            root: classes.tabRoot,
            selected: classes.tabSelected,
          }}
          style={{
            width: renderedTabWidth,
          }}
          value={Panel.Tables}
          disableRipple
          label={
            <Box display="flex">
              <TableChart style={{ verticalAlign: 'middle' }} />
              <Box ml={1}>{t('Tables')}</Box>
            </Box>
          }
          {...a11yProps(Panel.Tables)}
        />
      );
    }, [
      a11yProps,
      areTablesAvailable,
      classes.tabRoot,
      classes.tabSelected,
      renderedTabWidth,
      t,
    ]);

    return (
      <div className={classes.root}>
        <div className={classes.tabsWrapper}>
          <div className={classes.tabsContainer}>
            <Tabs
              value={tabValue}
              onChange={handleChange}
              aria-label="left panel tabs"
            >
              <Tab
                classes={{
                  root: classes.tabRoot,
                  selected: classes.tabSelected,
                }}
                style={{
                  width: renderedTabWidth,
                }}
                value={Panel.Layers}
                disableRipple
                {...a11yProps(Panel.Layers)}
              />
              {renderedChartsTab}
              <Tab
                classes={{
                  root: classes.tabRoot,
                  selected: classes.tabSelected,
                }}
                style={{
                  width: renderedTabWidth,
                }}
                value={Panel.Analysis}
                disableRipple
                {...a11yProps(Panel.Analysis)}
              />
              {renderedTablesTab}
            </Tabs>
          </div>
          <TabPanel value={tabValue} index={Panel.Layers}>
            <LayersPanel />
          </TabPanel>
          {renderedChartsPanel}
          <TabPanel value={tabValue} index={Panel.Analysis}>
            {analysisPanel}
          </TabPanel>
          {renderedTablesPanel}
        </div>
        {resultsPage}
      </div>
    );
  },
);

export default LeftPanelTabs;
