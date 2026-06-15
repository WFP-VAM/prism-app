import { Button, createStyles, makeStyles } from '@material-ui/core';
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
  const classes = useStyles();
  const history = useHistory();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
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
    <div className={classes.root}>
      <Button
        className={classes.button}
        fullWidth
        variant="outlined"
        startIcon={<Public />}
        onClick={handleClick}
      >
        {t('Back to global')}
      </Button>
    </div>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      flexShrink: 0,
      padding: '0.5rem',
      borderTop: '1px solid #E0E0E0',
    },
    button: {
      color: '#323638',
      borderColor: '#323638',
      textTransform: 'none',
      fontWeight: 600,
    },
  }),
);

export default BackToGlobalButton;
