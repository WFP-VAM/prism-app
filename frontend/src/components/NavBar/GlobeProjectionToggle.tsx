import { Public, PublicOutlined } from '@mui/icons-material';
import {
  Button,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { usesGlobeProjection } from 'components/MapView/Map/utils';
import { setGlobeProjectionEnabled } from 'context/mapStateSlice';
import { globeProjectionEnabledSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import { memo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const iconSx = { color: 'white', fontSize: '1.5rem' };

const GlobeProjectionToggle = memo(() => {
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('md'));
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
          sx={{
            height: '2.5em',
            backgroundColor: enabled ? cyanBlue : undefined,
          }}
          onClick={toggle}
          aria-label={t('Globe Mode')}
          aria-pressed={enabled}
          startIcon={
            enabled ? (
              <Public sx={{ ...iconSx, color: black }} />
            ) : (
              <PublicOutlined sx={iconSx} />
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
          sx={{ backgroundColor: enabled ? cyanBlue : undefined }}
          onClick={toggle}
          aria-label={t('Globe Mode')}
          aria-pressed={enabled}
        >
          {enabled ? (
            <Public sx={{ ...iconSx, color: black }} />
          ) : (
            <PublicOutlined sx={iconSx} />
          )}
        </IconButton>
      )}
    </>
  );
});

export default GlobeProjectionToggle;
