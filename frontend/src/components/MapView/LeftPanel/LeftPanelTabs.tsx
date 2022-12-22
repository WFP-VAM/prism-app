import { createStyles, makeStyles, Tab, Tabs } from '@material-ui/core';
import { LayersOutlined, BarChartOutlined } from '@material-ui/icons';
import React, { useState } from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
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

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
      height: '100%',
    },
    tabs: {
      backgroundColor: '#566064',
      width: '100%',
    },
    indicator: {
      backgroundColor: '#53888F',
      height: '10%',
    },
    tabRoot: {
      textTransform: 'none',
      minWidth: 50,
      width: 'calc(100% / 3)',
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
}

function LeftPanelTabs({ layersPanel, chartsPanel, analysisPanel }: TabsProps) {
  const classes = useStyles();
  const [value, setValue] = useState(0);

  const handleChange = (_: any, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className={classes.root}>
      <div className={classes.tabs}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="styled tabs example"
          classes={{ indicator: classes.indicator }}
        >
          <Tab
            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
            disableRipple
            label={
              <div>
                <LayersOutlined style={{ verticalAlign: 'middle' }} />
                Layers
              </div>
            }
            {...a11yProps(0)}
          />
          <Tab
            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
            disableRipple
            label={
              <div>
                <LayersOutlined style={{ verticalAlign: 'middle' }} />
                Charts
              </div>
            }
            {...a11yProps(1)}
          />
          <Tab
            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
            disableRipple
            label={
              <div>
                <BarChartOutlined style={{ verticalAlign: 'middle' }} />
                Analysis
              </div>
            }
            {...a11yProps(2)}
          />
        </Tabs>
      </div>
      <TabPanel value={value} index={0}>
        {layersPanel}
      </TabPanel>
      <TabPanel value={value} index={1}>
        {chartsPanel}
      </TabPanel>
      <TabPanel value={value} index={2}>
        {analysisPanel}
      </TabPanel>
    </div>
  );
}

export default LeftPanelTabs;
