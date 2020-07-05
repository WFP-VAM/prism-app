import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createStyles,
  Snackbar,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Notification,
  notificationsSelector,
  removeNotification,
} from '../../context/notificationStateSlice';

function Notifier({ classes }: NotifierProps) {
  const dispatch = useDispatch();
  const notifications = useSelector(notificationsSelector);
  const autoHideDuration = 50000;

  const handleClose = (notification: Notification) => () => {
    dispatch(removeNotification(notification.key));
  };
  return (
    <>
      {notifications.map((notification, i) => {
        return (
          <Snackbar
            key={notification.key}
            style={{ marginTop: `${i * 50}px` }}
            className={classes.notification}
            autoHideDuration={autoHideDuration}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            open
          >
            <Alert
              variant="filled"
              severity={notification.type}
              onClose={handleClose(notification)}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        );
      })}
    </>
  );
}

const styles = () =>
  createStyles({
    notification: {
      top: '65px',
      '@media (max-width:960px)': {
        top: '25px',
      },
    },
  });

interface NotifierProps extends WithStyles<typeof styles> {}
export default withStyles(styles)(Notifier);
