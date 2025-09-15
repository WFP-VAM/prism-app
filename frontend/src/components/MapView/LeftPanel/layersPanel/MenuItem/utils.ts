import { createStyles, makeStyles } from '@material-ui/core';

export const useLayerMenuItemStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
      backgroundColor: '#FFFF',
    },
    rootSummary: {
      backgroundColor: '#FFFF',
    },
    rootDetails: {
      padding: 0,
    },
    expandIcon: {
      color: 'black',
    },
    summaryContent: {
      alignItems: 'center',
    },
    title: {
      color: 'black',
      fontSize: '14px',
      fontWeight: 600,
    },
    chipRoot: {
      marginLeft: '3%',
    },
  }),
);
