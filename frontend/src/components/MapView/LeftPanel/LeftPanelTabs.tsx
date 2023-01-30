import {
  Box,
  createStyles,
  makeStyles,
  Tab,
  Tabs,
  Theme,
} from '@material-ui/core';
import {
  LayersOutlined,
  BarChartOutlined,
  ImageAspectRatioOutlined,
} from '@material-ui/icons';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PanelSize } from '../../../config/types';
import { getWMSLayersWithChart } from '../../../config/utils';
import {
  setTabValue,
  leftPanelTabValueSelector,
} from '../../../context/leftPanelStateSlice';
import { useSafeTranslation } from '../../../i18n';

const areChartLayersAvailable = getWMSLayersWithChart().length > 0;

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      style={{ flexGrow: 1, height: 'calc(93vh - 48px)' }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function a11yProps(index: any) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
  };
}

interface StyleProps {
  panelSize: PanelSize;
}

const useStyles = makeStyles<Theme, StyleProps>(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    tabsContainer: {
      backgroundColor: '#566064',
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
      width: `calc(100% / ${areChartLayersAvailable ? 3 : 2})`,
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
  panelSize: PanelSize;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
}

function LeftPanelTabs({
  layersPanel,
  chartsPanel,
  analysisPanel,
  panelSize,
  setPanelSize,
}: TabsProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const classes = useStyles({ panelSize });
  const tabValue = useSelector(leftPanelTabValueSelector);

  const handleChange = (_: any, newValue: number) => {
    setPanelSize(PanelSize.medium);
    dispatch(setTabValue(newValue));
  };

  return (
    <div className={classes.root}>
      <div className={classes.tabsContainer}>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          aria-label="left panel tabs"
          classes={{ indicator: classes.indicator }}
        >
          <Tab
            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
            value={0}
            disableRipple
            label={
              <Box display="flex">
                <LayersOutlined style={{ verticalAlign: 'middle' }} />
                <Box ml={1}>{t('Layers')}</Box>
              </Box>
            }
            {...a11yProps(0)}
          />
          {areChartLayersAvailable && (
            <Tab
              classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
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
          )}
          <Tab
            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
            value={2}
            disableRipple
            label={
              <Box display="flex">
                <ImageAspectRatioOutlined style={{ verticalAlign: 'middle' }} />
                <Box ml={1}>{t('Analysis')}</Box>
              </Box>
            }
            {...a11yProps(2)}
          />
        </Tabs>
      </div>
      <TabPanel value={tabValue} index={0}>
        {layersPanel}
      </TabPanel>
      {areChartLayersAvailable && (
        <TabPanel value={tabValue} index={1}>
          {chartsPanel}
        </TabPanel>
      )}
      <TabPanel value={tabValue} index={2}>
        {analysisPanel}
      </TabPanel>
    </div>
  );
}

export default LeftPanelTabs;
