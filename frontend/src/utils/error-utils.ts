import { Dispatch } from 'redux';
import { addNotification } from '../context/notificationStateSlice';

export const catchErrorAndDispatchNotification = <T>(
  error: Error,
  dispatch: Dispatch,
  returnedValue: T,
  abortErrorText = 'Request Timeout',
): T => {
  if (error.name === 'AbortError') {
    dispatch(
      addNotification({
        message: abortErrorText,
        type: 'warning',
      }),
    );
    return returnedValue;
  }
  dispatch(
    addNotification({
      message: error.message,
      type: 'warning',
    }),
  );
  return returnedValue;
};
