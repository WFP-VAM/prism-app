import { BoundaryLayerProps } from 'config/types';
import { fetchBoundaryLayerData } from 'context/layers/boundary';
import { boundaryCache } from 'utils/boundary-cache';

jest.mock('context/layers/boundary', () => ({
  fetchBoundaryLayerData: jest.fn(),
}));

const mockFetchBoundaryLayerData =
  fetchBoundaryLayerData as jest.MockedFunction<typeof fetchBoundaryLayerData>;

const layer = {
  id: 'test_boundary',
  format: 'geojson',
  path: '/data/test.json',
} as BoundaryLayerProps;

const dispatch = jest.fn();
const staleData = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { id: 'stale' }, geometry: null },
  ],
};
const freshData = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { id: 'fresh' }, geometry: null },
  ],
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('boundary-cache forceRefresh', () => {
  beforeEach(() => {
    boundaryCache.clearCache();
    mockFetchBoundaryLayerData.mockReset();
  });

  it('does not let a stale in-flight load overwrite refreshed cache data', async () => {
    const staleDeferred = createDeferred<typeof staleData>();
    const freshDeferred = createDeferred<typeof freshData>();

    mockFetchBoundaryLayerData
      .mockImplementationOnce(() => async () => staleDeferred.promise)
      .mockImplementationOnce(() => async () => freshDeferred.promise);

    const initialLoad = boundaryCache.getBoundaryData(layer, dispatch);
    const refreshLoad = boundaryCache.refreshBoundaryData(layer, dispatch);

    expect(mockFetchBoundaryLayerData).toHaveBeenCalledTimes(1);

    staleDeferred.resolve(staleData);
    freshDeferred.resolve(freshData);
    await expect(refreshLoad).resolves.toEqual(freshData);
    await initialLoad;
    expect(mockFetchBoundaryLayerData).toHaveBeenCalledTimes(2);
    expect(
      boundaryCache.getCachedData(layer.id)?.features?.[0]?.properties?.id,
    ).toBe('fresh');
  });
});
