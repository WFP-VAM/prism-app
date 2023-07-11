import {
  Badge,
  Box,
  createStyles,
  makeStyles,
  Tab,
  Tabs,
  Theme,
} from '@material-ui/core';
import {
  BarChartOutlined,
  ImageAspectRatioOutlined,
  LayersOutlined,
  TableChart,
} from '@material-ui/icons';
import React, { memo, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sum } from 'lodash';
import { PanelSize } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { useSafeTranslation } from 'i18n';
import { analysisResultSelector } from 'context/analysisResultStateSlice';
import TabPanel from './TabPanel';

interface StyleProps {
  tabValue: number;
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
        tabValue === 1 || tabValue === 3 ? 'hidden' : 'auto',
    },
    tabsWrapper: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    tabsContainer: {
      backgroundColor: '#566064',
      order: -2,
      width: ({ panelSize }) =>
        panelSize !== PanelSize.folded ? PanelSize.medium : PanelSize.folded,
    },
    indicator: {
      backgroundColor: '#53888F',
      height: '10%',
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
  layersPanel: React.ReactNode;
  chartsPanel: React.ReactNode;
  analysisPanel: React.ReactNode;
  tablesPanel: React.ReactNode;
  areTablesAvailable: boolean;
  panelSize: PanelSize;
  resultsPage: JSX.Element | null;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  activeLayers: number;
}

const LeftPanelTabs = memo(
  ({
    layersPanel,
    chartsPanel,
    analysisPanel,
    tablesPanel,
    areTablesAvailable,
    panelSize,
    resultsPage,
    setPanelSize,
    activeLayers,
  }: TabsProps) => {
    const { t } = useSafeTranslation();
    const dispatch = useDispatch();
    const tabValue = useSelector(leftPanelTabValueSelector);
    const analysisData = useSelector(analysisResultSelector);
    const classes = useStyles({ panelSize, tabValue });

    const areChartLayersAvailable = useMemo(() => {
      return getWMSLayersWithChart().length > 0;
    }, []);

    const handleChange = useCallback(
      (_: any, newValue: number) => {
        setPanelSize(PanelSize.medium);
        dispatch(setTabValue(newValue));
      },
      [dispatch, setPanelSize],
    );

    const layersBadgeContent = useMemo(() => {
      if (!analysisData) {
        return activeLayers;
      }
      return activeLayers + 1;
    }, [activeLayers, analysisData]);

    const renderedLayersTabLabel = useMemo(() => {
      if (
        tabValue !== 0 &&
        panelSize !== PanelSize.folded &&
        layersBadgeContent >= 1
      ) {
        return (
          <Badge
            anchorOrigin={{
              horizontal: 'left',
              vertical: 'top',
            }}
            badgeContent={layersBadgeContent}
            color="secondary"
          >
            <LayersOutlined style={{ verticalAlign: 'middle' }} />
            <Box ml={1}>{t('Layers')}</Box>
          </Badge>
        );
      }
      return (
        <>
          <LayersOutlined style={{ verticalAlign: 'middle' }} />
          <Box ml={1}>{t('Layers')}</Box>
        </>
      );
    }, [layersBadgeContent, panelSize, t, tabValue]);

    const a11yProps = useCallback((index: any) => {
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
        <TabPanel value={tabValue} index={1}>
          {chartsPanel}
        </TabPanel>
      );
    }, [areChartLayersAvailable, chartsPanel, tabValue]);

    const renderedTablesPanel = useMemo(() => {
      if (!areTablesAvailable) {
        return null;
      }
      return (
        <TabPanel value={tabValue} index={3}>
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
          value={1}
          disableRipple
          label={
            <Box display="flex">
              <BarChartOutlined style={{ verticalAlign: 'middle' }} />
              <Box ml={1}>{t('Charts')}</Box>
            </Box>
          }
          {...a11yProps(1)}
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
          value={3}
          disableRipple
          label={
            <Box display="flex">
              <TableChart style={{ verticalAlign: 'middle' }} />
              <Box ml={1}>{t('Tables')}</Box>
            </Box>
          }
          {...a11yProps(3)}
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
              classes={{ indicator: classes.indicator }}
            >
              <Tab
                classes={{
                  root: classes.tabRoot,
                  selected: classes.tabSelected,
                }}
                style={{
                  width: renderedTabWidth,
                }}
                value={0}
                disableRipple
                label={<Box display="flex">{renderedLayersTabLabel}</Box>}
                {...a11yProps(0)}
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
                value={2}
                disableRipple
                label={
                  <Box display="flex">
                    <ImageAspectRatioOutlined
                      style={{ verticalAlign: 'middle' }}
                    />
                    <Box ml={1}>{t('Analysis')}</Box>
                  </Box>
                }
                {...a11yProps(2)}
              />
              {renderedTablesTab}
            </Tabs>
          </div>
          <TabPanel value={tabValue} index={0}>
            {layersPanel}
          </TabPanel>
          {renderedChartsPanel}
          <TabPanel value={tabValue} index={2}>
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
