import {
  Button,
  createStyles,
  IconButton,
  makeStyles,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { VisibilityOffOutlined, VisibilityOutlined } from '@material-ui/icons';
import { Panel } from 'config/types';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import { memo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';

import LegendItemsList from './LegendItemsList';

/** Tabs where left panel is full-viewport data UI; floating legend lives under AppBar (z-index above Drawer) and would cover charts/tables (React 19 stacking unchanged—behavior was always wrong; upgrade made it more visible). */
function shouldHideFloatingMapLegend(tabValue: Panel): boolean {
  return tabValue === Panel.Charts || tabValue === Panel.Tables;
}

const Legends = memo(() => {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const tabValue = useSelector(leftPanelTabValueSelector);

  const [open, setOpen] = useState(true);

  const toggleLegendVisibility = useCallback(() => {
    setOpen(o => !o);
  }, []);

  if (shouldHideFloatingMapLegend(tabValue)) {
    return null;
  }

  return (
    <>
      {!smDown && (
        <Button
          className={classes.triggerButton}
          style={{ backgroundColor: open ? cyanBlue : undefined }}
          onClick={toggleLegendVisibility}
          aria-label={t('Legend')}
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
      )}

      {!mdUp && (
        <IconButton
          size="small"
          style={{ backgroundColor: open ? cyanBlue : undefined }}
          onClick={toggleLegendVisibility}
          aria-label={t('Legend')}
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
      )}

      {open &&
        createPortal(
          <LegendItemsList listStyle={classes.list} />,
          document.body,
        )}
    </>
  );
});

const useStyles = makeStyles(theme =>
  createStyles({
    triggerButton: {
      height: '2.5em',
    },
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '78vh', // same size as the left panel
      position: 'fixed',
      right: '1rem',
      top: 'calc(56px + 16px)',
      // Outside the nav stacking context. The flood station panel sits at
      // appBar, the nav itself at drawer + 1, so the legend stays under both.
      zIndex: theme.zIndex.appBar - 1,
    },
    icon: { color: 'white', fontSize: '1.5rem' },
  }),
);

export default Legends;
