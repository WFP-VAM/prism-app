import { camelCase } from 'lodash';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayerType } from 'config/types';
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
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);

  const clearHistory = () => {
    navigate({ search: '' }, { replace: true });
  };

  const appendLayerToUrl = (
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
  };

  const removeLayerFromUrl = (layerKey: UrlLayerKey, layerId: string) => {
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

    navigate({ search: urlParams.toString() }, { replace: true });
  };

  const updateAnalysisParams = (analysisParams: AnalysisParams) => {
    Object.entries(analysisParams).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    navigate({ search: urlParams.toString() }, { replace: true });
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
    navigate({ search: urlParams.toString() }, { replace: true });
  };

  const updateHistory = (key: string, value: string) => {
    urlParams.set(key, value);
    navigate({ search: urlParams.toString() }, { replace: true });
  };

  const removeKeyFromUrl = (key: string) => {
    urlParams.delete(key);

    if (key === UrlLayerKey.HAZARD) {
      urlParams.delete('date');
    }

    navigate({ search: urlParams.toString() }, { replace: true });
  };

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
