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
import mapBoundaryInfoStateReduce from './mapBoundaryInfoStateSlice';
import datasetResultStateReduce from './datasetStateSlice';
import mapTileLoadingStateReduce from './mapTileLoadingStateSlice';
import leftPanelStateReduce from './leftPanelStateSlice';
import opacityStateReduce from './opacityStateSlice';
import anticipatoryActionDroughtStateReduce from './anticipatoryAction/AADroughtStateSlice';
import anticipatoryActionStormStateReduce from './anticipatoryAction/AAStormStateSlice';

const reducer = combineReducers({
  mapState: mapStateReduce,
  serverState: serverStateReduce,
  tableState: tableStateReduce,
  tooltipState: tooltipStateReduce,
  analysisResultState: analysisResultStateReduce,
  notificationState: notificationStateReduce,
  mapSelectionLayerStateSlice: mapSelectionLayerStateReduce,
  mapBoundaryInfoState: mapBoundaryInfoStateReduce,
  datasetState: datasetResultStateReduce,
  mapTileLoadingState: mapTileLoadingStateReduce,
  leftPanelState: leftPanelStateReduce,
  opacityState: opacityStateReduce,
  anticipatoryActionDroughtState: anticipatoryActionDroughtStateReduce,
  anticipatoryActionStormState: anticipatoryActionStormStateReduce,
});

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware({
    // TODO: Instead of snoozing this check, we might want to
    // serialize the state
    serializableCheck: false,
    immutableCheck: {
      // do not check the following state branches for accidental
      // mutations. This saves a lot of time in dev mode (but has no
      // impact on production builds).
      ignoredPaths: [
        'mapState.boundaryRelations',
        'mapState.layersData',
        'analysisResultState.result',
        'serverState.availableDates',
      ],
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
