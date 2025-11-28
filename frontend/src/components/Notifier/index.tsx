import { useCallback, useEffect, useRef, useState } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { useDispatch, useSelector } from 'react-redux';
import omit from 'lodash/omit';
;
import { Alert } from '@mui/material';
import {
  Notification,
  notificationsSelector,
  removeNotification,
} from 'context/notificationStateSlice';

const AUTO_CLOSE_TIME = 10 * 1000;

function Notifier() {
  const dispatch = useDispatch();
  const classes = useStyles();
  const notifications = useSelector(notificationsSelector);
  const [topOffset, setTopOffset] = useState(65);

  const notificationTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // make sure the notifications don't overlap the nav bar.
  useEffect(() => {
    const toolbar = document.getElementsByClassName('MuiToolbar-root')[0];
    function handleResize() {
      if (!toolbar) {
        return;
      }
      setTopOffset(toolbar.clientHeight + 15);
    }
    // try make sure the toolbar is available to use on first run, not too dangerous if it doesn't work - default value is good for most screens.
    setTimeout(handleResize, 500);

    window.addEventListener('resize', handleResize);

    // cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = (notification: Notification) => () => {
    dispatch(removeNotification(notification.key));
  };

  const autoClose = useCallback(
    (notification: Notification) => () => {
      clearTimeout(notificationTimers.current[notification.key]);
      notificationTimers.current = omit(
        notificationTimers.current,
        notification.key,
      );
      dispatch(removeNotification(notification.key));
    },
    [dispatch],
  );

  useEffect(() => {
    notifications.forEach(notification => {
      if (!(notification.key in notificationTimers.current)) {
        notificationTimers.current = {
          ...notificationTimers.current,
          [notification.key]: setTimeout(
            autoClose(notification),
            AUTO_CLOSE_TIME,
          ),
        };
      }
    });
  }, [autoClose, notifications]);

  return (
    <div className={classes.notificationsContainer} style={{ top: topOffset }}>
      {notifications.map(notification => (
        <Alert
          variant="filled"
          severity={notification.type}
          key={notification.key}
          onClose={handleClose(notification)}
          className={classes.alert}
        >
          {notification.message}
        </Alert>
      ))}
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    notificationsContainer: {
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      zIndex: 9999,
      flexDirection: 'column',
      position: 'fixed',
      alignItems: 'center',
    },
    alert: {
      marginBottom: '10px',
    },
  }),
);

export default Notifier;
