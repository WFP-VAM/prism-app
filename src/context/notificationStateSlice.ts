import {
  AnyAction,
  createSlice,
  Middleware,
  PayloadAction,
} from '@reduxjs/toolkit';
import { Color } from '@material-ui/lab';
import { AppDispatch, RootState } from './store';

type NotificationConstructor = {
  message: string;
  type: Color;
};

export class Notification {
  readonly message: string;
  readonly type: Color;
  readonly key: number;

  displayed: boolean = false;

  constructor({ message, type }: NotificationConstructor) {
    this.key = Date.now(); // each notification needs a unique ID. Date.now() seems to do the job
    this.type = type;
    this.message = message;
  }
}

type NotificationState = {
  notifications: Array<Notification>;
};

const initialState: NotificationState = {
  notifications: [],
};

export const notificationStateSlice = createSlice({
  name: 'notificationState',
  initialState,
  reducers: {
    addNotification: (
      { notifications, ...rest },
      { payload }: PayloadAction<NotificationConstructor>,
    ) => ({
      ...rest,
      notifications: notifications.concat(new Notification(payload)),
    }),
    removeNotification: (
      { notifications, ...rest },
      { payload }: PayloadAction<Notification['key']>,
    ) => ({
      ...rest,
      notifications: notifications.filter(
        notification => notification.key !== payload,
      ),
    }),
    setAsDisplayed: (
      { notifications, ...rest },
      { payload }: PayloadAction<Notification['key']>,
    ) => ({
      ...rest,
      notifications: notifications.map(notification => {
        if (payload !== notification.key) return notification;
        return { ...notification, displayed: true };
      }),
    }),
  },
});

// Getters
export const notificationsSelector = (
  state: RootState,
): NotificationState['notifications'] => state.notificationState.notifications;

// Setters
export const {
  addNotification,
  removeNotification,
  setAsDisplayed,
} = notificationStateSlice.actions;

// middleware to add error as notifications to this slice
// I don't know how to type this properly
export const errorToNotificationMiddleware: Middleware<{}, RootState> = () => (
  dispatch: AppDispatch,
) => (action: AnyAction) => {
  let dispatchResult;
  try {
    // catch sync errors
    // eslint-disable-next-line fp/no-mutation
    dispatchResult = dispatch(action);
  } catch (err) {
    console.error(err);
    dispatch(
      addNotification({
        type: 'error',
        message: err.message || err,
      }),
    );
    return dispatchResult;
  }
  const errorActions = [
    // async thunks that have errors included with them
    'tableState/loadTable/rejected',
    'serverState/loadAvailableDates/rejected',
    'mapState/loadLayerData/rejected',
  ];
  if (errorActions.includes(action.type)) {
    dispatch(
      addNotification({
        type: 'error',
        message:
          typeof action.error === 'string'
            ? action.error
            : action.error.message,
      }),
    );
  }

  return dispatchResult;
};

export default notificationStateSlice.reducer;
