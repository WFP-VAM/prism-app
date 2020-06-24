import React from 'react';
import {
  Button,
  createStyles,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { Assessment } from '@material-ui/icons';

function Analyser({ classes }: AnalyserProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={classes.container}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(!open)}
      >
        <Assessment style={{ marginRight: '10px' }} />
        <Typography variant="body2">Run Analysis</Typography>
      </Button>
      <div
        className={classes.analyserMenu}
        style={{ width: open ? 500 : 0, padding: open ? 50 : 0 }}
      >
        This is Analyser Menu
      </div>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    container: {
      zIndex: theme.zIndex.drawer,
      position: 'absolute',
      top: -2,
      left: -2,
      textAlign: 'left',
    },
    analyserMenu: {
      backgroundColor: '#5A686C',
      maxWidth: '100vw',
      color: 'white',
      overflowX: 'hidden',
      transition: 'all 0.5s ease-in-out',
      whiteSpace: 'nowrap',
      borderTopRightRadius: '10px',
      borderBottomRightRadius: '10px',
      height: '600px',
      maxHeight: '90vh',
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
