import {
  cogLayerLoadingState,
  cogLoadingLayerIdsSelector,
  finishLayerLoading,
  startLayerLoading,
} from './cogLayerLoadingStateSlice';
import type { RootState } from './store';

describe('cogLayerLoadingStateSlice', () => {
  const reducer = cogLayerLoadingState.reducer;

  it('starts and finishes loading for a layer id', () => {
    let state = reducer(undefined, startLayerLoading('ndvi_dekad'));
    expect(state.loadingLayerIds).toEqual(['ndvi_dekad']);

    state = reducer(state, finishLayerLoading('ndvi_dekad'));
    expect(state.loadingLayerIds).toEqual([]);
  });

  it('deduplicates startLayerLoading for the same id', () => {
    let state = reducer(undefined, startLayerLoading('ndvi_dekad'));
    state = reducer(state, startLayerLoading('ndvi_dekad'));
    expect(state.loadingLayerIds).toEqual(['ndvi_dekad']);
  });

  it('exposes loading ids via selector', () => {
    const rootState = {
      cogLayerLoadingState: { loadingLayerIds: ['ndvi_dekad'] },
    } as RootState;
    expect(cogLoadingLayerIdsSelector(rootState)).toEqual(['ndvi_dekad']);
  });
});
