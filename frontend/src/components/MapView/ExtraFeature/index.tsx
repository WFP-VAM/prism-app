import { Grid, WithStyles, createStyles, withStyles } from '@material-ui/core';
import React from 'react';
import useLayers from 'utils/layers-utils';
import Legends from '../Legends';

const styles = createStyles({
  buttonContainer: {
    zIndex: 5,
    // Allow users to click on the map through this div.
    // Make sure to activate the pointers on elements that should
    // remain clickable.
    pointerEvents: 'none',
    width: '100%',
    maxHeight: '100px',
    padding: '3px 8px 0 16px',
  },
});

interface ExtraFeatureProps extends WithStyles<typeof styles> {
  isAlertFormOpen: boolean;
  setIsAlertFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ExtraFeature = ({
  classes,
  isAlertFormOpen,
  setIsAlertFormOpen,
}: ExtraFeatureProps) => {
  const { selectedLayers, adminBoundariesExtent } = useLayers();

  return (
    <Grid
      container
      justifyContent="space-between"
      className={classes.buttonContainer}
    >
      <Grid item />
      <Grid item>
        <Grid container spacing={1} style={{ pointerEvents: 'auto' }}>
          <Legends layers={selectedLayers} extent={adminBoundariesExtent} />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default withStyles(styles)(ExtraFeature);
