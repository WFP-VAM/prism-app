import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import {
  createStyles,
  IconButton,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import {
  notificationsSelector,
  removeNotification,
  setAsDisplayed,
} from '../../context/notificationStateSlice';

// built with the help of https://codesandbox.io/s/github/iamhosseindhv/notistack/tree/master/examples/redux-example?file=/Notifier.js
function Notifier({ classes }: NotifierProps) {
  const dispatch = useDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const notifications = useSelector(notificationsSelector);
  const autoHideDuration = 50000;

  useEffect(() => {
    notifications.forEach(notification => {
      const { key, displayed, message, type } = notification;

      if (displayed) return; // already displayed, nothing to do here.
      enqueueSnackbar(message, {
        key,
        autoHideDuration,
        variant: type,
        className: classes.notification,
        action: () => (
          <IconButton onClick={() => closeSnackbar(key)}>
            <CloseIcon style={{ color: 'white' }} />
          </IconButton>
        ),
        anchorOrigin: { horizontal: 'center', vertical: 'top' },
        onExited: () => {
          dispatch(removeNotification(key as number));
        },
      });
      dispatch(setAsDisplayed(key));
    });
  }, [
    notifications,
    enqueueSnackbar,
    dispatch,
    closeSnackbar,
    classes.notification,
  ]);

  return null;
}

const styles = () =>
  createStyles({
    notification: {
      top: '45px',
      '@media (max-width:960px)': {
        top: '25px',
      },
    },
  });

interface NotifierProps extends WithStyles<typeof styles> {}
export default withStyles(styles)(Notifier);
