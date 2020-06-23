import React from 'react';
import {
  Button,
  createStyles,
  Theme,
  withStyles,
  WithStyles,
} from '@material-ui/core';

function Analyser({ classes }: AnalyserProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={classes.container}>
      <Button onClick={() => setOpen(!open)}>Run analysis</Button>
      {open && (
        <>
          <p>This is an analyser</p>
        </>
      )}
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    container: {
      zIndex: theme.zIndex.drawer,
      position: 'absolute',
      top: 24,
      left: 24,
      textAlign: 'left',
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
