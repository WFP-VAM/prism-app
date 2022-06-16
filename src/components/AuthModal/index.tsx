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
} from '@material-ui/core';
import { LayerType } from '../../config/types';
import { useSafeTranslation } from '../../i18n';
import { layersSelector } from '../../context/mapStateSlice/selectors';

import { setLayerAccessToken } from '../../context/serverStateSlice';

const AuthModal = ({ classes }: AuthModalProps) => {
  const [layerWithAuth, setLayers] = useState<LayerType>();
  const [open, setOpen] = useState(true);
  const [textFieldValue, setTextField] = useState<string>('');
  const selectedLayers = useSelector(layersSelector);
  const dispatch = useDispatch();

  const { t } = useSafeTranslation();

  useEffect(() => {
    const layersWithAuthRequired = selectedLayers.find(
      layer => layer.type === 'point_data' && layer.tokenRequired,
    );
    setLayers(layersWithAuthRequired);
  }, [selectedLayers]);

  if (!layerWithAuth) {
    return null;
  }

  const validateToken = () => {
    dispatch(setLayerAccessToken(textFieldValue));
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
        <TextField
          id="access_token"
          label="Access Token"
          value={textFieldValue}
          className={classes.textField}
          onChange={e => setTextField(e.target.value)}
        />

        <div className={classes.container}>
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
        </div>
      </div>
    </Dialog>
  );
};

const styles = (theme: Theme) =>
  createStyles({
    modal: {
      width: '40vw',
      height: '26vh',
      color: theme.palette.text.secondary,
      padding: '1em 0.75em',
    },
    title: {
      color: theme.palette.text.secondary,
      marginBottom: '1.5em',
      padding: 0,
    },
    textField: {
      marginTop: '1em',
      '& .MuiInputBase-input': { color: theme.palette.text.secondary },
    },
    container: {
      display: 'flex',
      justifyContent: 'flex-end',
    },
    buttonWrapper: {
      marginTop: '1em',
      display: 'flex',
      width: '33%',
      justifyContent: 'space-between',
    },
  });

export interface AuthModalProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AuthModal);
