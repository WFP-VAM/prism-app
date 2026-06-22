import {
  Button,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { Public } from '@material-ui/icons';
import { clearAnalysisResult } from 'context/analysisResultStateSlice';
import { useSafeTranslation } from 'i18n';
import { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { getUniversalMapPath } from 'utils/universal-routing';
import { useMapState } from 'utils/useMapState';

const UNIVERSAL_ADMIN0_LAYER_ID = 'universal_admin0_boundaries';

const BackToGlobalButton = memo(() => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const {
    layers,
    actions: { removeLayer },
  } = useMapState();

  const handleClick = useCallback(() => {
    // Reset everything so the global view only shows the admin0 country
    // boundaries. The admin0 boundary layer is kept and simply re-filtered to
    // the whole world once no country is selected.
    layers
      .filter(layer => layer.id !== UNIVERSAL_ADMIN0_LAYER_ID)
      .forEach(layer => removeLayer(layer));
    dispatch(clearAnalysisResult());
    // Navigating to "/" clears the layer/date query params from the URL, which
    // prevents them from being re-added by the url-driven layer loader.
    history.push(getUniversalMapPath());
  }, [layers, removeLayer, dispatch, history]);

  return (
    <>
      {!smDown && (
        <Button startIcon={<Public />} onClick={handleClick}>
          <Typography style={{ color: '#FFF', textTransform: 'none' }}>
            {t('Back to global')}
          </Typography>
        </Button>
      )}
      {!mdUp && (
        <IconButton
          style={{ color: 'white' }}
          onClick={handleClick}
          aria-label={t('Back to global')}
        >
          <Public />
        </IconButton>
      )}
    </>
  );
});

export default BackToGlobalButton;
