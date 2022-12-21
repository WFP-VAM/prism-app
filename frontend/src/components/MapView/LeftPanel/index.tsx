import { createStyles, Drawer, makeStyles } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles(() =>
  createStyles({
    paper: {
      marginTop: '60px',
      width: '20%',
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
      TEST
    </Drawer>
  );
}

export default LeftPanel;
