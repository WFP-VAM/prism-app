import {
  Button,
  createStyles,
  IconButton,
  Typography,
  makeStyles,
  useTheme,
  useMediaQuery,
} from '@material-ui/core';
import { VisibilityOutlined, VisibilityOffOutlined } from '@material-ui/icons';
import { useState, memo, useCallback } from 'react';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import LegendItemsList from './LegendItemsList';

const Legends = memo(() => {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [open, setOpen] = useState(true);

  const toggleLegendVisibility = useCallback(() => {
    setOpen(!open);
  }, [open]);

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

      {open && <LegendItemsList listStyle={classes.list} />}
    </>
  );
});

const useStyles = makeStyles(() =>
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
      top: 'calc(56px + 16px)',
    },
    icon: { color: 'white', fontSize: '1.5rem' },
  }),
);

export default Legends;
