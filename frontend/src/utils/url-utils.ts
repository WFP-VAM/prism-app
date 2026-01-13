import { camelCase } from 'lodash';
import { useHistory } from 'react-router-dom';
import { LayerType } from 'config/types';
import { useCallback, useMemo } from 'react';
import { AnalysisParams } from './types';
import { keepLayer } from './keep-layer-utils';

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
 */
export function getStagingParam(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('staging') === 'true';
}

/**
 * Returns the correct anticipatory action drought URL based on the staging param and config.
 * Only returns the staging URL if isStaging is true and the staging URL exists.
 */
export function getAADroughtUrl(appConfig: any): string | undefined {
  const isStaging = getStagingParam();
  if (isStaging && appConfig.anticipatoryActionDroughtStagingUrl) {
    return appConfig.anticipatoryActionDroughtStagingUrl;
  }
  return appConfig.anticipatoryActionDroughtUrl;
}
