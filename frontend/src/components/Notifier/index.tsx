import { Alert, Box } from '@mui/material';
import {
  Notification,
  notificationsSelector,
  removeNotification,
} from 'context/notificationStateSlice';
import omit from 'lodash/omit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { alertSx, notificationsContainerSx } from './notifierStyles';

const AUTO_CLOSE_TIME = 10 * 1000;

function Notifier() {
  const dispatch = useDispatch();
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

  // Don't show notifications on export view
  if (window.location.pathname === '/export') {
    return null;
  }

  return (
    <Box sx={{ ...notificationsContainerSx, top: topOffset }}>
      {notifications.map(notification => (
        <Alert
          variant="filled"
          severity={notification.type}
          key={notification.key}
          onClose={handleClose(notification)}
          sx={alertSx}
        >
          {notification.message}
        </Alert>
      ))}
    </Box>
  );
}

export default Notifier;
