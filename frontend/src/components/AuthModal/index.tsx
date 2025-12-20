import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  createStyles,
  Dialog,
  DialogTitle,
  TextField,
  Theme,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { Close, Send } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { setUserAuthGlobal, userAuthSelector } from 'context/serverStateSlice';
import { refetchLayerDatesArraysForPointData } from 'context/serverPreloadStateSlice';
import { UserAuth } from 'config/types';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { removeLayer } from 'context/mapStateSlice';

const initialAuthState: UserAuth = {
  username: '',
  password: '',
};

const AuthModal = () => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<UserAuth>(initialAuthState);

  const userAuth = useSelector(userAuthSelector);

  const selectedLayers = useSelector(layersSelector);
  const { removeLayerFromUrl } = useUrlHistory();
  const dispatch = useDispatch();

  const isUserAuthenticated = useMemo(() => userAuth !== undefined, [userAuth]);

  const { t } = useSafeTranslation();

  const layersWithAuthRequired = useMemo(
    () =>
      selectedLayers.filter(
        layer => layer.type === 'point_data' && layer.authRequired,
      ),
    [selectedLayers],
  );

  useEffect(() => {
    if (!layersWithAuthRequired.length || isUserAuthenticated) {
      return;
    }
    setOpen(true);
  }, [isUserAuthenticated, layersWithAuthRequired]);

  const validateToken = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      dispatch(setUserAuthGlobal(auth));
      // Re-fetch dates with new authentication to filter by province if applicable
      dispatch(refetchLayerDatesArraysForPointData());
      setOpen(false);
    },
    [auth, dispatch],
  );

  // The layer with auth title
  const layerWithAuthTitle = useMemo(
    () =>
      layersWithAuthRequired.reduce(
        (acc: string, currentLayer, currentLayerIndex) =>
          currentLayerIndex === 0
            ? (t(currentLayer?.title as any) ?? '')
            : `${acc}, ${t(currentLayer.title as any)}`,
        '',
      ),
    [layersWithAuthRequired, t],
  );

  // function that handles the text-field on change
  const handleInputTextChanged = useCallback(
    (identifier: keyof UserAuth) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setAuth(params => ({ ...params, [identifier]: value }));
    },
    [],
  );

  // function that is invoked when cancel is clicked
  const onCancelClick = useCallback(() => {
    // for each layer that needs authentication remove them from url and from the map
    layersWithAuthRequired.forEach(layer => {
      const urlLayerKey = getUrlKey(layer);
      removeLayerFromUrl(urlLayerKey, layer.id);
      dispatch(removeLayer(layer));
    });
    setAuth(initialAuthState);
    setOpen(false);
  }, [dispatch, layersWithAuthRequired, removeLayerFromUrl]);

  // function that handles the close modal
  const closeModal = useCallback(
    (_event: any, reason: any) => {
      if (reason === 'backdropClick') {
        onCancelClick();
        return;
      }
      setOpen(false);
    },
    [onCancelClick],
  );

  // renders the Auth modal only if a user isn't already authenticated
  return useMemo(() => {
    if (isUserAuthenticated) {
      return null;
    }
    return (
      <Dialog
        maxWidth="xl"
        open={open}
        keepMounted
        onClose={closeModal}
        aria-labelledby="dialog-preview"
      >
        <div className={classes.modal}>
          <DialogTitle className={classes.title} id="dialog-preview">
            {t('Authentication required')}
          </DialogTitle>

          <Typography color="textSecondary" variant="h4">
            {t('The following layer requires authentication')}:{' '}
            {layerWithAuthTitle}
          </Typography>
          <form noValidate onSubmit={validateToken}>
            <Box
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '2em',
              }}
            >
              <Box
                style={{
                  width: '45%',
                }}
              >
                <Typography className={classes.label} variant="body2">
                  {t('Username')}
                </Typography>
                <TextField
                  id="username"
                  value={auth.username}
                  className={classes.textField}
                  onChange={handleInputTextChanged('username')}
                />
              </Box>
              <Box
                style={{
                  width: '45%',
                }}
              >
                <Typography className={classes.label} variant="body2">
                  {t('Password')}
                </Typography>
                <TextField
                  id="password"
                  value={auth.password}
                  type="password"
                  className={classes.textField}
                  onChange={handleInputTextChanged('password')}
                />
              </Box>
            </Box>
            <Box
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <div className={classes.buttonWrapper}>
                <Button
                  type="reset"
                  variant="outlined"
                  color="secondary"
                  onClick={onCancelClick}
                  startIcon={<Close />}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<Send />}
                >
                  {t('Send')}
                </Button>
              </div>
            </Box>
          </form>
        </div>
      </Dialog>
    );
  }, [
    auth.password,
    auth.username,
    classes.buttonWrapper,
    classes.label,
    classes.modal,
    classes.textField,
    classes.title,
    closeModal,
    handleInputTextChanged,
    isUserAuthenticated,
    layerWithAuthTitle,
    onCancelClick,
    open,
    t,
    validateToken,
  ]);
};

const useStyles = makeStyles((theme: Theme) => {
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
});

export default AuthModal;
