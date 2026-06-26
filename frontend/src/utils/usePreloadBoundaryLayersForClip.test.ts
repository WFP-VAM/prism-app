import { renderHook, waitFor } from '@testing-library/react';
import { BoundaryLayerProps } from 'config/types';
import { getBoundaryLayers } from 'config/utils';

import { boundaryCache } from './boundary-cache';
import { isUniversalDeployment } from './universal-utils';
import { usePreloadBoundaryLayersForClip } from './usePreloadBoundaryLayersForClip';

jest.mock('config/utils', () => ({
  getBoundaryLayers: jest.fn(),
}));

jest.mock('./boundary-cache', () => ({
  boundaryCache: {
    preloadBoundaries: jest.fn(),
  },
}));

jest.mock('./universal-utils', () => ({
  isUniversalDeployment: jest.fn(),
}));

const mockGetBoundaryLayers = getBoundaryLayers as jest.MockedFunction<
  typeof getBoundaryLayers
>;
const mockPreloadBoundaries =
  boundaryCache.preloadBoundaries as jest.MockedFunction<
    typeof boundaryCache.preloadBoundaries
  >;
const mockIsUniversalDeployment = isUniversalDeployment as jest.MockedFunction<
  typeof isUniversalDeployment
>;

const geojsonLayer = {
  id: 'admin1_boundaries',
  type: 'boundary',
  format: 'geojson',
  path: 'data/mozambique/moz_bnd_adm1_WFP.json',
} as BoundaryLayerProps;

const pmtilesLayer = {
  id: 'global_admin1_boundaries',
  type: 'boundary',
  format: 'pmtiles',
  path: 'https://pmtiles-hosting.s3.eu-central-1.amazonaws.com/global/global_admin_boundaries_no_drop.pmtiles',
} as BoundaryLayerProps;

const dispatch = jest.fn();

describe('usePreloadBoundaryLayersForClip', () => {
  beforeEach(() => {
    mockGetBoundaryLayers.mockReturnValue([geojsonLayer, pmtilesLayer]);
    mockPreloadBoundaries.mockResolvedValue(undefined);
    mockIsUniversalDeployment.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('preloads only non-PMTiles boundary layers in non-universal deployments', async () => {
    renderHook(() =>
      usePreloadBoundaryLayersForClip({
        enabled: true,
        dispatch,
      }),
    );

    await waitFor(() => {
      expect(mockPreloadBoundaries).toHaveBeenCalledWith(
        [geojsonLayer],
        dispatch,
        undefined,
      );
    });
  });

  it('preloads all boundary layers in universal deployments', async () => {
    mockIsUniversalDeployment.mockReturnValue(true);

    renderHook(() =>
      usePreloadBoundaryLayersForClip({
        enabled: true,
        dispatch,
      }),
    );

    await waitFor(() => {
      expect(mockPreloadBoundaries).toHaveBeenCalledWith(
        [geojsonLayer, pmtilesLayer],
        dispatch,
        undefined,
      );
    });
  });

  it('does not preload when disabled', () => {
    renderHook(() =>
      usePreloadBoundaryLayersForClip({
        enabled: false,
        dispatch,
      }),
    );

    expect(mockPreloadBoundaries).not.toHaveBeenCalled();
  });
});
