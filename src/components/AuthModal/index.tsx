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
import { LayerType, UserAuth } from '../../config/types';
import { useSafeTranslation } from '../../i18n';
import { layersSelector } from '../../context/mapStateSlice/selectors';

import {
  userAuthSelector,
  setUserAuthGlobal,
} from '../../context/serverStateSlice';

const AuthModal = ({ classes }: AuthModalProps) => {
  const [layerWithAuth, setLayers] = useState<LayerType>();
  const [open, setOpen] = useState(true);

  const authInitState: UserAuth = {
    username: '',
    password: '',
  };

  const [auth, setAuth] = useState<UserAuth>(authInitState);

  const selectedLayers = useSelector(layersSelector);
  const userAuthGlobal = useSelector(userAuthSelector);
  const dispatch = useDispatch();

  const { t } = useSafeTranslation();

  useEffect(() => {
    const layersWithAuthRequired = selectedLayers.find(
      layer => layer.type === 'point_data' && layer.authRequired,
    );
    setLayers(layersWithAuthRequired);

    setOpen(true);
  }, [selectedLayers]);

  useEffect(() => {
    if (!userAuthGlobal) {
      setOpen(true);
    }
  }, [userAuthGlobal]);

  if (!layerWithAuth) {
    return null;
  }

  const validateToken = () => {
    dispatch(setUserAuthGlobal(auth));
    setAuth(authInitState);
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
          {t('The following layer requires authentication')}:{' '}
          {layerWithAuth.title}
        </Typography>

        <Box
          width="100%"
          display="flex"
          justifyContent="space-between"
          marginTop="2em"
        >
          <Box width="45%">
            <Typography className={classes.label} variant="body2">
              {t('Username')}
            </Typography>
            <TextField
              id="username"
              value={auth.username}
              className={classes.textField}
              onChange={e => {
                const { value } = e.target;
                setAuth(params => ({ ...params, username: value }));
              }}
            />
          </Box>
          <Box width="45%">
            <Typography className={classes.label} variant="body2">
              {t('Password')}
            </Typography>
            <TextField
              id="password"
              value={auth.password}
              type="password"
              className={classes.textField}
              onChange={e => {
                const { value } = e.target;
                setAuth(params => ({ ...params, password: value }));
              }}
            />
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end">
          <div className={classes.buttonWrapper}>
            <Button variant="contained" color="primary" onClick={validateToken}>
              {t('Send')}
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
