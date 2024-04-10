import {
  Button,
  createStyles,
  Grid,
  Hidden,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { VisibilityOff, Visibility } from '@material-ui/icons';
import React, { useState, memo, useCallback } from 'react';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import LegendItemsList from './LegendItemsList';

const Legends = memo(({ classes, extent, layers }: LegendsProps) => {
  const { t } = useSafeTranslation();

  const [open, setOpen] = useState(true);

  const toggleLegendVisibility = useCallback(() => {
    setOpen(!open);
  }, [open]);

  const renderedVisibilityButton = React.useMemo(() => {
    if (open) {
      return <VisibilityOff fontSize="small" />;
    }
    return <Visibility fontSize="small" />;
  }, [open]);

  return (
    <Grid item className={classes.container}>
      <Button
        className={classes.triggerButton}
        variant="contained"
        color="primary"
        onClick={toggleLegendVisibility}
      >
        {renderedVisibilityButton}
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            {t('Legend')}
          </Typography>
        </Hidden>
      </Button>

      <LegendItemsList listStyle={classes.list} />
    </Grid>
  );
});

const styles = () =>
  createStyles({
    container: {
      textAlign: 'right',
    },
    triggerButton: {
      height: '3em',
    },
    label: {
      marginLeft: '10px',
    },
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '70vh',
      position: 'absolute',
      right: '16px',
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  extent?: Extent;
  layers: LayerType[];
}

export default withStyles(styles)(Legends);
