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

const initializeStore = async (getCurrentState: any) => {
  const layersAvailableDates = await getLayersAvailableDates();
  const currentState = getCurrentState();
  const { serverState } = currentState;

  return new Promise(resolve => {
    resolve({
      ...currentState,
      serverState: serverState.set('availableDates', layersAvailableDates),
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
