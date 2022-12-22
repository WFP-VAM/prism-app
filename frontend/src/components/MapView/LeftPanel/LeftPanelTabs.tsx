import { createStyles, makeStyles, Tab, Tabs } from '@material-ui/core';
import { LayersOutlined, BarChartOutlined } from '@material-ui/icons';
import React, { useState } from 'react';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
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

function LeftPanelTabs() {
  const classes = useStyles();
  const [value, setValue] = useState(0);

  const handleChange = (_: any, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className={classes.root}>
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
        />
      </Tabs>
    </div>
  );
}

export default LeftPanelTabs;
