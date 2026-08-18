import {
  Button,
  createStyles,
  IconButton,
  makeStyles,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { Public, PublicOutlined } from '@material-ui/icons';
import { usesGlobeProjection } from 'components/MapView/Map/utils';
import { setGlobeProjectionEnabled } from 'context/mapStateSlice';
import { globeProjectionEnabledSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import { memo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const GlobeProjectionToggle = memo(() => {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const dispatch = useDispatch();
  const enabled = useSelector(globeProjectionEnabledSelector);

  const toggle = useCallback(() => {
    dispatch(setGlobeProjectionEnabled(!enabled));
  }, [dispatch, enabled]);

  if (!usesGlobeProjection()) {
    return null;
  }

  return (
    <>
      {!smDown && (
        <Button
          className={classes.triggerButton}
          style={{ backgroundColor: enabled ? cyanBlue : undefined }}
          onClick={toggle}
          aria-label={t('Globe Mode')}
          aria-pressed={enabled}
          startIcon={
            enabled ? (
              <Public className={classes.icon} style={{ color: black }} />
            ) : (
              <PublicOutlined className={classes.icon} />
            )
          }
        >
          <Typography
            style={{
              color: enabled ? black : 'white',
              textTransform: 'none',
            }}
          >
            {t('Globe Mode')}
          </Typography>
        </Button>
      )}

      {!mdUp && (
        <IconButton
          size="small"
          style={{ backgroundColor: enabled ? cyanBlue : undefined }}
          onClick={toggle}
          aria-label={t('Globe Mode')}
          aria-pressed={enabled}
        >
          {enabled ? (
            <Public className={classes.icon} style={{ color: black }} />
          ) : (
            <PublicOutlined className={classes.icon} />
          )}
        </IconButton>
      )}
    </>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    triggerButton: {
      height: '2.5em',
    },
    icon: { color: 'white', fontSize: '1.5rem' },
  }),
);

export default GlobeProjectionToggle;
