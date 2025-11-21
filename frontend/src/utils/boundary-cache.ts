import { BoundaryLayerProps, LayerKey } from 'config/types';
import {
  BoundaryLayerData,
  fetchBoundaryLayerData,
} from 'context/layers/boundary';
import { Map as MaplibreMap } from 'maplibre-gl';
import type { Dispatch } from '@reduxjs/toolkit';

// Use a generic Dispatch type to avoid circular dependency with context/store
type DispatchFunction = Dispatch<any>;

interface BoundaryCacheEntry {
  data?: BoundaryLayerData;
  loading: boolean;
  error?: string;
}

type BoundaryCache = Map<LayerKey, BoundaryCacheEntry>;

class BoundaryCacheManager {
  private cache: BoundaryCache = new Map();
  private loadingPromises: Map<
    LayerKey,
    Promise<BoundaryLayerData | undefined>
  > = new Map();

  /**
   * Get boundary data from cache or trigger load
   * @param layer - The boundary layer to fetch
   * @param dispatch - Redux dispatch function (required for fetching)
   * @param map - Optional MapLibre map instance (needed for PMTiles)
   */
  async getBoundaryData(
    layer: BoundaryLayerProps,
    dispatch: DispatchFunction,
    map?: MaplibreMap,
  ): Promise<BoundaryLayerData | undefined> {
    const cacheKey = layer.id;
    const cached = this.cache.get(cacheKey);

    if (cached?.data) {
      return cached.data;
    }

    // Return existing loading promise to avoid duplicate fetches
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    this.cache.set(cacheKey, { data: undefined, loading: true });

    const loadPromise = this.loadBoundaryData(layer, dispatch, map);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const data = await loadPromise;
      this.cache.set(cacheKey, {
        data: data as BoundaryLayerData | undefined,
        loading: false,
      });
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.cache.set(cacheKey, {
        data: undefined,
        loading: false,
        error: errorMessage,
      });
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async loadBoundaryData(
    layer: BoundaryLayerProps,
    dispatch: DispatchFunction,
    map?: MaplibreMap,
  ): Promise<BoundaryLayerData | undefined> {
    // Use existing fetchBoundaryLayerData logic
    // Pass a no-op function as the recursive loader (boundary layer doesn't use it)
    const loader = fetchBoundaryLayerData((() => {}) as any);

    const params = {
      layer,
      map,
      date: Date.now(),
    };

    // Create minimal API object with dispatch
    const api = {
      dispatch,
      getState: () => ({}) as any, // Not used by boundary fetcher
      requestId: '',
      signal: new AbortController().signal,
      rejectWithValue: (value: any) => value,
      fulfillWithValue: (value: any) => value,
    };

    return loader(params as any, api as any);
  }

  getCachedData(layerId: string): BoundaryLayerData | undefined {
    return this.cache.get(layerId)?.data || undefined;
  }

  isLoading(layerId: string): boolean {
    return this.cache.get(layerId)?.loading || false;
  }

  /**
   * Get error if any - not used yet
   */
  getError(layerId: string): string | undefined {
    return this.cache.get(layerId)?.error;
  }

  /**
   * Preload all boundary layers
   * @param layers - Array of boundary layers to preload
   * @param dispatch - Redux dispatch function
   * @param map - Optional MapLibre map instance (needed for PMTiles)
   */
  async preloadBoundaries(
    layers: BoundaryLayerProps[],
    dispatch: DispatchFunction,
    map?: MaplibreMap,
  ): Promise<void> {
    await Promise.all(
      layers.map(layer => this.getBoundaryData(layer, dispatch, map)),
    );
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  getCachedLayerIds(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const boundaryCache = new BoundaryCacheManager();
