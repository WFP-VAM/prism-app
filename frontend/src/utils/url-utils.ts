import { LayerType } from 'config/types';
import { camelCase } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { AA_DROUGHT_API_URL } from './constants';
import { getCurrentDateTimeForUrl } from './date-utils';
import { keepLayer } from './keep-layer-utils';
import { AnalysisParams } from './types';

/*
  This custom hook tracks the browser url string, which is defined by the useHistory hook.
  We created additional functions to update the url based on user events, such as select date
  or select layer.
*/

const dummyAnalysisParams: AnalysisParams = {
  analysisBaselineLayerId: undefined,
  analysisHazardLayerId: undefined,
  analysisDate: '',
  analysisStatistic: '',
  analysisThresholdAbove: '',
  analysisThresholdBelow: '',
  analysisStartDate: '',
  analysisEndDate: '',
  analysisAdminLevel: '',
};

export enum UrlLayerKey {
  HAZARD = 'hazardLayerIds',
  ADMINLEVEL = 'baselineLayerId',
}

export const getUrlKey = (layer: LayerType): UrlLayerKey =>
  layer.type === 'admin_level_data'
    ? UrlLayerKey.ADMINLEVEL
    : UrlLayerKey.HAZARD;

export const useUrlHistory = () => {
  const { replace, location } = useHistory();
  // urlParams is very far down the react dependency tree, so needs
  // to be memoized to prevent a lot of unwanted rerendering
  const urlParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const clearHistory = () => {
    replace({ search: '' });
  };

  const appendLayerToUrl = useCallback(
    (
      layerKey: UrlLayerKey,
      selectedLayers: LayerType[],
      layer: LayerType,
    ): string => {
      const urlLayers = urlParams.get(layerKey);

      const selectedLayersUrl = urlLayers !== null ? urlLayers.split(',') : [];

      const filteredSelectedLayers =
        selectedLayers
          .filter(l => selectedLayersUrl.includes(l.id) && keepLayer(l, layer))
          .map(l => l.id) || [];

      const updatedUrl = [...filteredSelectedLayers, layer.id];

      return updatedUrl.join(',');
    },
    [urlParams],
  );

  const removeLayerFromUrl = useCallback(
    (layerKey: UrlLayerKey, layerId: string) => {
      // Get all layer ids from the url.
      const urlLayers = urlParams.get(layerKey);

      const selectedLayersUrl = urlLayers !== null ? urlLayers.split(',') : [];
      const filteredSelectedLayers = selectedLayersUrl
        .filter(l => l !== layerId)
        .join(',');

      // If the list of layers is empty, remove the layerKey from the url.
      if (filteredSelectedLayers === '') {
        urlParams.delete(layerKey);

        // For hazard layer, remove also the date.
        if (layerKey === UrlLayerKey.HAZARD) {
          urlParams.delete('date');
        }
      } else {
        urlParams.set(layerKey, filteredSelectedLayers);
      }

      replace({ search: urlParams.toString() });
    },
    [replace, urlParams],
  );

  const updateAnalysisParams = (analysisParams: AnalysisParams) => {
    Object.entries(analysisParams).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    replace({ search: urlParams.toString() });
  };

  const getAnalysisParams = (): AnalysisParams => {
    const result = Object.keys(dummyAnalysisParams).reduce(
      (acc, key) => ({ ...acc, [key]: urlParams.get(key) || undefined }),
      {},
    );
    return result;
  };

  const resetAnalysisParams = () => {
    Object.keys(dummyAnalysisParams).forEach(key => {
      urlParams.delete(key);
    });
    replace({ search: urlParams.toString() });
  };

  const updateHistory = useCallback(
    (key: string, value: string) => {
      urlParams.set(key, value);
      replace({ search: urlParams.toString() });
    },
    [replace, urlParams],
  );

  const removeKeyFromUrl = useCallback(
    (key: string) => {
      urlParams.delete(key);

      if (key === UrlLayerKey.HAZARD) {
        urlParams.delete('date');
      }

      replace({ search: urlParams.toString() });
    },
    [replace, urlParams],
  );

  return {
    urlParams,
    updateHistory,
    clearHistory,
    removeKeyFromUrl,
    updateAnalysisParams,
    resetAnalysisParams,
    getAnalysisParams,
    appendLayerToUrl,
    removeLayerFromUrl,
  };
};

export const queryParamsToString = (
  queryParams?: {
    [key: string]: string | { [key: string]: string };
  },
  preserveKey?: boolean,
): string =>
  queryParams
    ? Object.entries(queryParams)
        .map(([key, value]) => {
          if (key === 'filters') {
            const filterValues = Object.entries(value)
              .map(([filterKey, filterValue]) => `${filterKey}=${filterValue}`)
              .join(',');

            return `filters=${filterValues}`;
          }
          return `${preserveKey ? key : camelCase(key)}=${value}`;
        })
        .join('&')
    : '';

// utility function to combine a baseURL and relativeURL and remove any double slashes
export function combineURLs(baseURL: string, relativeURL: string) {
  return relativeURL
    ? `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`
    : baseURL;
}

/**
 * Returns true if the URL contains staging=true, otherwise false.
 *
 * Controls whether the read API includes DB-uploaded status=staging datasets
 * (via the `include_staging` query param).
 */
export function getStagingParam(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('staging') === 'true';
}

/**
 * Returns true if the URL contains aa-csv-preview=true, otherwise false.
 *
 * Enables previewing an AA drought CSV hosted on a remote (staging) S3 bucket,
 * configured via `anticipatoryActionDroughtPreviewUrl` in prism.json. Kept
 * separate from `staging=true` (which controls whether the read API serves
 * DB-uploaded status=staging datasets) so the S3 bucket can be previewed
 * independently.
 */
export function getAACsvPreviewParam(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('aa-csv-preview') === 'true';
}

/**
 * Returns the configured CDN URL for the anticipatory action drought CSV.
 * Only returns the preview (S3 bucket) URL if aa-csv-preview=true is set and
 * the staging URL exists.
 */
export function getAADroughtCdnUrl(appConfig: any): string | undefined {
  if (getAACsvPreviewParam() && appConfig.anticipatoryActionDroughtPreviewUrl) {
    return appConfig.anticipatoryActionDroughtPreviewUrl;
  }
  return appConfig.anticipatoryActionDroughtUrl;
}

/**
 * Returns the fetch URL for the anticipatory action drought CSV, cache-busted.
 *
 * When `aa-csv-preview=true` is set, fetches the configured S3 staging CSV
 * directly (bypassing the API) so the remote preview is always shown, even when
 * a DB-uploaded dataset exists for the country.
 *
 * Otherwise routes through the PRISM API (`/aa/drought/{country}.csv`), which
 * serves a government-uploaded dataset when one is published and otherwise
 * redirects to the configured CDN URL (passed as `fallback`).
 */
export function getAADroughtUrl(
  appConfig: any,
  country: string,
): string | undefined {
  const cdnUrl = getAADroughtCdnUrl(appConfig);
  const cacheBust = getCurrentDateTimeForUrl();

  // S3 preview always wins: fetch the remote CSV directly, skipping the
  // DB-first API so a published/staging DB dataset cannot shadow the preview.
  const previewUrl = appConfig.anticipatoryActionDroughtPreviewUrl;
  if (getAACsvPreviewParam() && previewUrl) {
    const previewParams = new URLSearchParams({ date: cacheBust });
    return `${previewUrl}?${previewParams.toString()}`;
  }

  const params = new URLSearchParams({ date: cacheBust });
  if (getStagingParam()) {
    params.set('include_staging', 'true');
  }
  if (cdnUrl) {
    params.set('fallback', cdnUrl);
  }
  return `${AA_DROUGHT_API_URL}/${country}.csv?${params.toString()}`;
}
