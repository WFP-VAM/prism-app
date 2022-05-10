import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

type MapTileLoadingState = {
  loading: boolean;
};

export const mapTileLoadingState = createSlice({
  name: 'mapTileLoadingState',
  initialState: {
    loading: false,
  } as MapTileLoadingState,
  reducers: {
    setLoading: (state, { payload }: PayloadAction<boolean>) => {
      return {
        loading: payload,
      };
    },
  },
});

export const { setLoading } = mapTileLoadingState.actions;

export const loadingSelector = (
  state: RootState,
): MapTileLoadingState['loading'] => state.mapTileLoadingState.loading;

export default mapTileLoadingState.reducer;
