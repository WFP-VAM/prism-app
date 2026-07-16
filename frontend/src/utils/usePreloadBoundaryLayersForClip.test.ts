import { renderHook, waitFor } from '@testing-library/react';
import { BoundaryLayerProps } from 'config/types';
import { getBoundaryLayers } from 'config/utils';

import { boundaryCache } from './boundary-cache';
import { usesPmtilesBoundaries } from './universal-utils';
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
  usesPmtilesBoundaries: jest.fn(),
}));

const mockGetBoundaryLayers = getBoundaryLayers as jest.MockedFunction<
  typeof getBoundaryLayers
>;
const mockPreloadBoundaries =
  boundaryCache.preloadBoundaries as jest.MockedFunction<
    typeof boundaryCache.preloadBoundaries
  >;
const mockUsesPmtilesBoundaries = usesPmtilesBoundaries as jest.MockedFunction<
  typeof usesPmtilesBoundaries
>;

const geojsonLayer = {
  id: 'admin1_boundaries',
  type: 'boundary',
  format: 'geojson',
  path: 'data/mozambique/moz_bnd_adm1_WFP.json',
} as BoundaryLayerProps;

const pmtilesLayer = {
  id: 'universal_admin1_boundaries',
  type: 'boundary',
  format: 'pmtiles',
  path: 'https://pmtiles-hosting.s3.eu-central-1.amazonaws.com/universal/global_admin_boundaries.pmtiles',
} as BoundaryLayerProps;

const dispatch = jest.fn();

describe('usePreloadBoundaryLayersForClip', () => {
  beforeEach(() => {
    mockGetBoundaryLayers.mockReturnValue([geojsonLayer, pmtilesLayer]);
    mockPreloadBoundaries.mockResolvedValue(undefined);
    mockUsesPmtilesBoundaries.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('preloads only non-PMTiles boundary layers for GeoJSON-boundary deployments', async () => {
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

  it('preloads all boundary layers for PMTiles-boundary deployments', async () => {
    mockUsesPmtilesBoundaries.mockReturnValue(true);

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
