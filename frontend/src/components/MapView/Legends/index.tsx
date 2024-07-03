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
import { useState, memo, useCallback } from 'react';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import LegendItemsList from './LegendItemsList';

const Legends = memo(({ classes }: LegendsProps) => {
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
          <Typography
            style={{ color: open ? black : 'white', textTransform: 'none' }}
          >
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

      {open && <LegendItemsList listStyle={classes.list} />}
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
      maxHeight: '78vh', // same size as the left panel
      position: 'absolute',
      right: '1rem',
      top: 'calc(6vh + 16px)',
    },
    icon: { color: 'white', fontSize: '1.5rem' },
  });

export interface LegendsProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Legends);
