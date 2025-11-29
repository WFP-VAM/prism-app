import {
  combineReducers,
  configureStore,
  PayloadAction,
} from '@reduxjs/toolkit';
import mapStateReduce from './mapStateSlice';
import serverStateReduce from './serverStateSlice';
import serverPreloadStateReduce from './serverPreloadStateSlice';
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
import dashboardStateReduce from './dashboardStateSlice';
import anticipatoryActionDroughtStateReduce from './anticipatoryAction/AADroughtStateSlice';
import anticipatoryActionStormStateReduce from './anticipatoryAction/AAStormStateSlice';
import anticipatoryActionFloodStateReduce from './anticipatoryAction/AAFloodStateSlice';

const reducer = combineReducers({
  mapState: mapStateReduce,
  serverState: serverStateReduce,
  serverPreloadState: serverPreloadStateReduce,
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
  dashboardState: dashboardStateReduce,
  anticipatoryActionDroughtState: anticipatoryActionDroughtStateReduce,
  anticipatoryActionStormState: anticipatoryActionStormStateReduce,
  anticipatoryActionFloodState: anticipatoryActionFloodStateReduce,
});

export const store = configureStore({
  reducer,
  // @ts-ignore
  devTools:
    // process.env.NODE_ENV !== 'development'
    !(window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? {}
      : {
          // sanitizers to make the state manageable by redux-dev-tools
          // actionSanitizer returns the action "cleaned up" for faster display (it does not
          // affect the original action, just how its displayed in redux-dev-tools)
          actionSanitizer: (action: PayloadAction<any>) => {
            switch (action.type) {
              case 'mapState/loadLayerData/fulfilled':
                return {
                  ...action,
                  payload: {
                    //  @ts-ignore
                    ...action?.payload,
                    data: {
                      ...action.payload.data,
                      features: `array of ${action.payload.data.features.length} features`,
                    },
                  },
                };
              case 'serverState/loadAvailableDates/fulfilled':
                return {
                  ...action,
                  payload: Object.fromEntries(
                    Object.entries(action.payload).map(
                      ([layerName, dateArray]) => [
                        layerName,
                        `array of ${(dateArray as Array<any>).length} date objects`,
                      ],
                    ),
                  ),
                };
              case 'serverState/preloadLayerDatesForWMS/fulfilled':
              case 'serverState/preloadLayerDatesForPointData/fulfilled':
                return {
                  ...action,
                  payload: {
                    arrays_of_numbers_for_these_layers: Object.keys(
                      action.payload,
                    ),
                  },
                };
              default:
                return action;
            }
          },
          // stateSanitizer does the same for the state. Virtually all the heavy data
          // is in mapState, so we just rewrite that part.
          stateSanitizer: (state: RootState) => ({
            ...state,
            mapState: {
              ...state.mapState,
              layersData: state.mapState.layersData.map(ld => ({
                ...ld,
                data: {
                  ...ld.data,
                  features: `array of ${ld.data.features.length} features`,
                },
              })),
            },
          }),
        },
  // @ts-expect-error - middleware type mismatch between RTK versions
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
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
          'serverPreloadState.layerDates',
        ],
      },
    }).concat(errorToNotificationMiddleware),
});

export type AppStore = typeof store;
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
