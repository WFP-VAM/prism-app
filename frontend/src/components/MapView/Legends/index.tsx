import {
  Button,
  createStyles,
  Hidden,
  IconButton,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { VisibilityOutlined, VisibilityOffOutlined } from '@material-ui/icons';
import React, { useState, memo, useCallback } from 'react';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';

import { black, cyanBlue } from 'muiTheme';
import LegendItemsList from './LegendItemsList';

const Legends = memo(({ classes, extent, layers }: LegendsProps) => {
  const { t } = useSafeTranslation();

  const [open, setOpen] = useState(true);

  const toggleLegendVisibility = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <>
      <Hidden smDown>
        <Button
          className={classes.triggerButton}
          style={{ backgroundColor: open ? cyanBlue : undefined }}
          onClick={toggleLegendVisibility}
          startIcon={
            open ? (
              <VisibilityOffOutlined
                className={classes.icon}
                style={{ color: black }}
              />
            ) : (
              <VisibilityOutlined className={classes.icon} />
            )
          }
        >
          <Typography style={{ color: open ? black : 'white' }}>
            {t('Legend')}
          </Typography>
        </Button>
      </Hidden>

      <Hidden mdUp>
        <IconButton
          style={{ backgroundColor: open ? cyanBlue : undefined }}
          onClick={toggleLegendVisibility}
        >
          {open ? (
            <VisibilityOffOutlined
              className={classes.icon}
              style={{ color: black }}
            />
          ) : (
            <VisibilityOutlined className={classes.icon} />
          )}
        </IconButton>
      </Hidden>

      <LegendItemsList />
    </>
  );
});

const styles = () =>
  createStyles({
    triggerButton: {
      height: '2.5em',
    },
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '70vh',
      position: 'absolute',
      right: '1rem',
      top: 'calc(7vh - 8px)',
    },
    icon: { color: 'white', fontSize: '1.5rem' },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  extent?: Extent;
  layers: LayerType[];
}

export default withStyles(styles)(Legends);
