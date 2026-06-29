import { Public } from '@mui/icons-material';
import {
  Button,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
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
    layers
      .filter(layer => layer.id !== UNIVERSAL_ADMIN0_LAYER_ID)
      .forEach(layer => removeLayer(layer));
    dispatch(clearAnalysisResult());
    history.push(getUniversalMapPath());
  }, [layers, removeLayer, dispatch, history]);

  return (
    <>
      {!smDown && (
        <Button
          startIcon={<Public />}
          onClick={handleClick}
          sx={{ color: 'white' }}
        >
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
          size="large"
        >
          <Public />
        </IconButton>
      )}
    </>
  );
});

export default BackToGlobalButton;
