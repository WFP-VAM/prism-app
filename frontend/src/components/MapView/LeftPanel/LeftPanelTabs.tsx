import {
  createStyles,
  Drawer,
  makeStyles,
  Tab,
  Tabs,
  withStyles,
} from '@material-ui/core';
// import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
// import StackedBarChartOutlinedIcon from '@mui/icons-material/StackedBarChartOutlined';
import { LayersOutlined, BarChartOutlined } from '@material-ui/icons';
import React, { useState } from 'react';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      backgroundColor: '#566064',
    },
    indicator: {
      width: '100%',
      maxWidth: 40,
      backgroundColor: '#53888F',
      borderRight: '500px solid #53888F', // hack to get rid of red indicator -- probably best to mirror styled components similar to example
    },
    tabs: {
      display: 'flex',
      maxWidth: '100%',
    },
    tab: {
      minWidth: 50,
      textTransform: 'none',
      color: '#fff',
      width: '33%',
      '&:focus': {
        opacity: 1,
        backgroundColor: '#3C3F40',
        boxShadow: 'inset 0px -8px 0px #53888F',
      },
    },
  }),
);

function LeftPanelTabs() {
  const classes = useStyles();
  const [value, setValue] = useState(0);

  const handleChange = (_: any, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className={classes.root}>
      <Tabs
        className={classes.tabs}
        value={value}
        onChange={handleChange}
        aria-label="styled tabs example"
        TabIndicatorProps={{ children: <span className={classes.indicator} /> }}
      >
        <Tab
          className={classes.tab}
          disableRipple
          label="Layers"
          icon={<LayersOutlined />}
        />
        <Tab
          className={classes.tab}
          disableRipple
          label="Charts"
          icon={<BarChartOutlined />}
        />
        <Tab
          className={classes.tab}
          disableRipple
          label="Analysis"
          icon={<BarChartOutlined />}
        />
      </Tabs>
    </div>
  );
}

export default LeftPanelTabs;
