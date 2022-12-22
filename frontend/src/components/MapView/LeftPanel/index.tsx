import { createStyles, Drawer, makeStyles } from '@material-ui/core';
import React from 'react';
import LeftPanelTabs from './LeftPanelTabs';

const useStyles = makeStyles(() =>
  createStyles({
    paper: {
      marginTop: '60px',
      width: '30%',
    },
  }),
);

function LeftPanel() {
  const classes = useStyles();
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open
      classes={{ paper: classes.paper }}
    >
      <LeftPanelTabs />
    </Drawer>
  );
}

export default LeftPanel;
