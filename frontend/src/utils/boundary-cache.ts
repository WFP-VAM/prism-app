import type { Dispatch } from '@reduxjs/toolkit';
import { BoundaryLayerProps, LayerKey } from 'config/types';
import {
  BoundaryLayerData,
  fetchBoundaryLayerData,
} from 'context/layers/boundary';
import { Map as MaplibreMap } from 'maplibre-gl';
import { normalizeIso3 } from 'utils/universal-utils';

// Use a generic Dispatch type to avoid circular dependency with context/store
type DispatchFunction = Dispatch<any>;

interface BoundaryCacheEntry {
  data?: BoundaryLayerData;
  loading: boolean;
  error?: string;
}

type BoundaryCache = Map<string, BoundaryCacheEntry>;
type CacheListener = () => void;

class BoundaryCacheManager {
  private cache: BoundaryCache = new Map();

  private loadingPromises: Map<string, Promise<BoundaryLayerData | undefined>> =
    new Map();

  private listeners: Set<CacheListener> = new Set();

  private getCacheKey(layerId: LayerKey, iso3?: string): string {
    const normalizedIso3 = normalizeIso3(iso3);
    return normalizedIso3 ? `${layerId}::${normalizedIso3}` : layerId;
  }

  subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  private deleteCacheEntry(cacheKey: string): void {
    this.cache.delete(cacheKey);
    this.loadingPromises.delete(cacheKey);
  }

  /**
   * Get boundary data from cache or trigger load
   * @param layer - The boundary layer to fetch
   * @param dispatch - Redux dispatch function (required for fetching)
   * @param map - Optional MapLibre map instance (needed for PMTiles)
   * @param iso3 - Optional ISO3 filter for universal deployment
   * @param forceRefresh - When true, bypass cached data and reload
   */
  async getBoundaryData(
    layer: BoundaryLayerProps,
    dispatch: DispatchFunction,
    map?: MaplibreMap,
    iso3?: string,
    forceRefresh = false,
  ): Promise<BoundaryLayerData | undefined> {
    const cacheKey = this.getCacheKey(layer.id, iso3);
    const cached = this.cache.get(cacheKey);

    if (!forceRefresh && cached?.data) {
      return cached.data;
    }

    // Return existing loading promise to avoid duplicate fetches
    if (!forceRefresh && this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    this.cache.set(cacheKey, { data: undefined, loading: true });

    const loadPromise = this.loadBoundaryData(layer, dispatch, map, iso3);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const data = await loadPromise;
      const isEmpty = !data?.features?.length && layer.format === 'pmtiles';
      if (isEmpty) {
        this.deleteCacheEntry(cacheKey);
      } else {
        this.cache.set(cacheKey, {
          data: data as BoundaryLayerData | undefined,
          loading: false,
        });
      }
      this.notifyListeners();
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.cache.set(cacheKey, {
        data: undefined,
        loading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async loadBoundaryData(
    layer: BoundaryLayerProps,
    dispatch: DispatchFunction,
    map?: MaplibreMap,
    iso3?: string,
  ): Promise<BoundaryLayerData | undefined> {
    const loader = fetchBoundaryLayerData((() => {}) as any);

    const params = {
      layer,
      map,
      date: Date.now(),
      iso3Filter: normalizeIso3(iso3),
    };

    const api = {
      dispatch,
      getState: () => ({}) as any,
      requestId: '',
      signal: new AbortController().signal,
      rejectWithValue: (value: any) => value,
      fulfillWithValue: (value: any) => value,
    };

    return loader(params as any, api as any);
  }

  async refreshBoundaryData(
    layer: BoundaryLayerProps,
    dispatch: DispatchFunction,
    map?: MaplibreMap,
    iso3?: string,
  ): Promise<BoundaryLayerData | undefined> {
    const cacheKey = this.getCacheKey(layer.id, iso3);
    this.deleteCacheEntry(cacheKey);
    return this.getBoundaryData(layer, dispatch, map, iso3, true);
  }

  async refreshBoundaries(
    layers: BoundaryLayerProps[],
    dispatch: DispatchFunction,
    map?: MaplibreMap,
    iso3?: string,
  ): Promise<void> {
    await Promise.all(
      layers.map(layer => this.refreshBoundaryData(layer, dispatch, map, iso3)),
    );
  }

  getCachedData(layerId: string, iso3?: string): BoundaryLayerData | undefined {
    const cacheKey = this.getCacheKey(layerId as LayerKey, iso3);
    return this.cache.get(cacheKey)?.data || undefined;
  }

  isLoading(layerId: string, iso3?: string): boolean {
    const cacheKey = this.getCacheKey(layerId as LayerKey, iso3);
    return this.cache.get(cacheKey)?.loading || false;
  }

  getError(layerId: string, iso3?: string): string | undefined {
    const cacheKey = this.getCacheKey(layerId as LayerKey, iso3);
    return this.cache.get(cacheKey)?.error;
  }

  async preloadBoundaries(
    layers: BoundaryLayerProps[],
    dispatch: DispatchFunction,
    map?: MaplibreMap,
    iso3?: string,
  ): Promise<void> {
    await Promise.all(
      layers.map(layer => this.getBoundaryData(layer, dispatch, map, iso3)),
    );
  }

  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.notifyListeners();
  }

  getCachedLayerIds(): string[] {
    return Array.from(this.cache.keys());
  }
}

export const boundaryCache = new BoundaryCacheManager();
