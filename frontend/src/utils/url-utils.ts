import { camelCase } from 'lodash';
import { useHistory } from 'react-router-dom';
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
  const { replace, location } = useHistory();
  const urlParams = new URLSearchParams(location.search);

  const clearHistory = () => {
    replace({ search: '' });
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

    replace({ search: urlParams.toString() });
  };

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

  const updateHistory = (key: string, value: string) => {
    urlParams.set(key, value);
    replace({ search: urlParams.toString() });
  };

  const removeKeyFromUrl = (key: string) => {
    urlParams.delete(key);

    if (key === UrlLayerKey.HAZARD) {
      urlParams.delete('date');
    }

    replace({ search: urlParams.toString() });
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
