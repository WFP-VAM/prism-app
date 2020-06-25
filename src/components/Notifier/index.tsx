import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createStyles,
  Snackbar,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  notificationsSelector,
  setAsDisplayed,
  Notification,
  removeNotification,
} from '../../context/notificationStateSlice';

function Notifier({ classes }: NotifierProps) {
  const dispatch = useDispatch();
  const notifications = useSelector(notificationsSelector);
  const autoHideDuration = 50000;
  const [openNotification, setOpenNotification] = useState<Notification | null>(
    null,
  );

  useEffect(() => {
    notifications.forEach(notification => {
      const { key, displayed } = notification;

      if (displayed || openNotification) return; // already displayed or something already displayed, nothing to do here.
      setOpenNotification(notification);
      dispatch(setAsDisplayed(key));
    });
  }, [notifications, dispatch, classes.notification, openNotification]);
  const handleClose = () => {
    if (!openNotification) return;
    dispatch(removeNotification(openNotification.key));
    setOpenNotification(null);
  };

  return (
    <Snackbar
      className={classes.notification}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={!!openNotification}
      onClose={handleClose}
    >
      <Alert
        variant="filled"
        severity={openNotification?.type}
        onClose={handleClose}
      >
        {openNotification?.message}
      </Alert>
    </Snackbar>
  );
}

const styles = () =>
  createStyles({
    notification: {
      top: '55px',
      '@media (max-width:960px)': {
        top: '25px',
      },
    },
  });

interface NotifierProps extends WithStyles<typeof styles> {}
export default withStyles(styles)(Notifier);
