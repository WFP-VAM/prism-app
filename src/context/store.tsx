import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import filtersReduce from './filters/filtersSlice';

export const store = configureStore({
  reducer: {
    filters: filtersReduce,
  },
  // TODO: Instead of snoozing this check, we might want to
  // serialize the state
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

export type RootState = ReturnType<typeof store.getState>;
