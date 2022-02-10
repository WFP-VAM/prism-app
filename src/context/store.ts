import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import mapStateReduce from './mapStateSlice';
import serverStateReduce from './serverStateSlice';
import tableStateReduce from './tableStateSlice';
import tooltipStateReduce from './tooltipStateSlice';
import notificationStateReduce, {
  errorToNotificationMiddleware,
} from './notificationStateSlice';
import analysisResultStateReduce from './analysisResultStateSlice';
import mapSelectionLayerStateReduce from './mapSelectionLayerStateSlice';
import datasetResultStateReduce from './chartDataStateSlice';
import legendsStateReduce from './legendsStateSlice';

const reducer = combineReducers({
  mapState: mapStateReduce,
  serverState: serverStateReduce,
  tableState: tableStateReduce,
  tooltipState: tooltipStateReduce,
  analysisResultState: analysisResultStateReduce,
  notificationState: notificationStateReduce,
  mapSelectionLayerStateSlice: mapSelectionLayerStateReduce,
  datasetState: datasetResultStateReduce,
  legendsState: legendsStateReduce,
});

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware({
    // TODO: Instead of snoozing this check, we might want to
    // serialize the state
    serializableCheck: false,
    immutableCheck: {
      ignoredPaths: ['mapState.layersData', 'analysisResultState.result'],
    },
  }).concat(errorToNotificationMiddleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof reducer>;

export type ThunkApi = {
  dispatch: AppDispatch;
  getState: () => RootState;
  // can add 'extra' and 'rejectValue' here if we ever need them
  // https://redux-toolkit.js.org/usage/usage-with-typescript#createasyncthunk
};

// Used as the third type definition for typing createAsyncThunk
// e.g. createAsyncThunk<ReturnType, HandlerType, CreateAsyncThunkTypes>
export type CreateAsyncThunkTypes = {
  dispatch: AppDispatch;
  state: RootState;
};
