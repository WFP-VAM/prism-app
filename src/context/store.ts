import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import mapStateReduce from './mapStateSlice';

export const store = configureStore({
  reducer: {
    mapState: mapStateReduce,
  },
  // TODO: Instead of snoozing this check, we might want to
  // serialize the state
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

export type RootState = ReturnType<typeof store.getState>;
