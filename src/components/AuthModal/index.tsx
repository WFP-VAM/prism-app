import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createStyles,
  Dialog,
  DialogTitle,
  Theme,
  WithStyles,
  withStyles,
  Typography,
  TextField,
  Button,
  Box,
} from '@material-ui/core';
import { LayerType, BoundaryLayerProps } from '../../config/types';
import { getBoundaryLayers } from '../../config/utils';
import { useSafeTranslation } from '../../i18n';
import {
  layersSelector,
  layerDataSelector,
} from '../../context/mapStateSlice/selectors';

import {
  jwtAccessTokenSelector,
  setLayerAccessToken,
} from '../../context/serverStateSlice';
import { LayerData } from '../../context/layers/layer-data';

const AuthModal = ({ classes }: AuthModalProps) => {
  const [layerWithAuth, setLayers] = useState<LayerType>();
  const [open, setOpen] = useState(true);
  const [jwtValue, setJwtValue] = useState<string>('');
  const selectedLayers = useSelector(layersSelector);
  const jwtAccessToken = useSelector(jwtAccessTokenSelector);
  const dispatch = useDispatch();

  // Get the admin boundary layer, with lowest number of level names (provinces).
  const boundaryLayer = getBoundaryLayers().reduce((boundary, item) =>
    boundary.adminLevelNames.length > item.adminLevelNames.length
      ? item
      : boundary,
  );

  const boundaryData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const { t } = useSafeTranslation();

  useEffect(() => {
    const layersWithAuthRequired = selectedLayers.find(
      layer => layer.type === 'point_data' && layer.tokenRequired,
    );
    setLayers(layersWithAuthRequired);

    setOpen(true);
  }, [selectedLayers]);

  useEffect(() => {
    if (!jwtAccessToken) {
      setOpen(true);
    }
  }, [jwtAccessToken]);

  if (!layerWithAuth || !boundaryData) {
    return null;
  }

  const validateToken = () => {
    dispatch(setLayerAccessToken(jwtValue));
    setOpen(false);
  };

  return (
    <Dialog
      maxWidth="xl"
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      aria-labelledby="dialog-preview"
    >
      <div className={classes.modal}>
        <DialogTitle className={classes.title} id="dialog-preview">
          {t('Authentication required')}
        </DialogTitle>

        <Typography color="textSecondary" variant="h4">
          {t('The following layer  requires an access token')}:{' '}
          {layerWithAuth.title}
        </Typography>

        <Box
          width="70%"
          display="flex"
          justifyContent="space-between"
          marginTop="2em"
        >
          <Box width="70%">
            <Typography className={classes.label} variant="body2">
              {t('access token')}
            </Typography>
            <TextField
              id="accesstoken"
              value={jwtValue}
              className={classes.textField}
              onChange={e => {
                const { value } = e.target;
                setJwtValue(value);
              }}
            />
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end">
          <div className={classes.buttonWrapper}>
            <Button variant="contained" color="primary" onClick={validateToken}>
              {t('Accept')}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setOpen(false)}
            >
              {t('Cancel')}
            </Button>
          </div>
        </Box>
      </div>
    </Dialog>
  );
};

const styles = (theme: Theme) => {
  const { secondary } = theme.palette.text;

  const color = {
    color: secondary,
  };

  const inputColor = {
    '& .MuiInputBase-input': color,
  };

  return createStyles({
    modal: {
      width: '40vw',
      padding: '1em 0.75em',
    },
    title: {
      marginBottom: '1.5em',
      padding: 0,
      ...color,
    },
    label: color,
    textField: { ...inputColor, width: '100%' },
    buttonWrapper: {
      marginTop: '2em',
      marginBottom: '1em',
      display: 'flex',
      width: '33%',
      justifyContent: 'space-between',
    },
  });
};

export interface AuthModalProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AuthModal);
