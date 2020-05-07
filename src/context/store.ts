import { fromJS } from 'immutable';
import {
  configureStore,
  getDefaultMiddleware,
  combineReducers,
} from '@reduxjs/toolkit';
import {
  innerReducer,
  outerReducer,
  middleware,
} from 'redux-async-initial-state';

import mapStateReduce from './mapStateSlice';
import serverStateReduce from './serverStateSlice';
import { getLayersAvailableDates } from '../utils/server-utils';
import { LAYERS_AVAILABLE_DATES } from '../constants';
import { AvailableDates } from '../config/types';

const initializeStore = async (getCurrentState: any) => {
  const isStorageSet = localStorage.getItem(LAYERS_AVAILABLE_DATES) !== null;

  if (isStorageSet) {
    // Aborting the initialization
    return Promise.reject();
  }

  const layersAvailableDates = await getLayersAvailableDates();
  const currentState = getCurrentState();
  const { serverState } = currentState;

  localStorage.setItem(
    LAYERS_AVAILABLE_DATES,
    JSON.stringify(layersAvailableDates),
  );

  return new Promise(resolve => {
    resolve({
      ...currentState,
      serverState: serverState.set(
        'availableDates',
        fromJS(layersAvailableDates) as AvailableDates,
      ),
    });
  });
};

const reducer = outerReducer(
  combineReducers({
    mapState: mapStateReduce,
    serverState: serverStateReduce,
    asyncInitialState: innerReducer,
  }),
);

export const store = configureStore({
  reducer,
  // TODO: Instead of snoozing this check, we might want to
  // serialize the state
  middleware: [
    middleware(initializeStore),
    ...getDefaultMiddleware({
      serializableCheck: false,
    }),
  ],
});

export type RootState = ReturnType<typeof store.getState>;
