import { Grid, WithStyles, createStyles, withStyles } from '@material-ui/core';
import GoToBoundaryDropdown from 'components/Common/BoundaryDropdown/goto';
import React from 'react';
import { appConfig } from 'config';
import { LayerType } from 'config/types';
import Legends from '../Legends';
import { Extent } from '../Layers/raster-utils';
import AlertForm from '../AlertForm';

const styles = createStyles({
  buttonContainer: {
    zIndex: 5,
    // Allow users to click on the map through this div
    pointerEvents: 'none',
    // Give children the ability to be clicked however
    // (go down 2 levels to target raw elements, instead of individual grid cells)
    '& > * > *': {
      pointerEvents: 'auto',
    },
    width: '100%',
    maxHeight: '100px',
    padding: '3px 8px 0 16px',
  },
});

interface ExtraFeatureProps extends WithStyles<typeof styles> {
  selectedLayers: LayerType[];
  adminBoundariesExtent?: Extent;
  isAlertFormOpen: boolean;
  setIsAlertFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ExtraFeature = ({
  classes,
  selectedLayers,
  adminBoundariesExtent,
  isAlertFormOpen,
  setIsAlertFormOpen,
}: ExtraFeatureProps) => {
  const { alertFormActive } = appConfig;

  return (
    <Grid
      container
      justifyContent="space-between"
      className={classes.buttonContainer}
    >
      <Grid item>
        <Grid container spacing={1}>
          <Grid item>
            <GoToBoundaryDropdown />
          </Grid>
          {alertFormActive && (
            <Grid item>
              <AlertForm
                isOpen={isAlertFormOpen}
                setOpen={setIsAlertFormOpen}
              />
            </Grid>
          )}
        </Grid>
      </Grid>
      <Grid item>
        <Grid container spacing={1}>
          <Legends layers={selectedLayers} extent={adminBoundariesExtent} />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default withStyles(styles)(ExtraFeature);
