import { List, WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { useCallback } from 'react';
import { createGetLegendGraphicUrl } from 'prism-common';
import { AdminLevelDataLayerProps, LayerType } from 'config/types';
import LegendItem from 'components/MapView/Legends/LegendItem';
import LegendImpactResult from 'components/MapView/Legends/LegendImpactResult';
import { useSafeTranslation } from 'i18n';
import { AnalysisResult, BaselineLayerResult } from 'utils/analysis-utils';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { Dispatch } from 'redux';
import { LayerData } from 'context/layers/layer-data';

function LegendList({
  classes,
  layers,
  extent,
  isAnalysisLayerActive,
  analysisResult,
  analysisLayerOpacity,
  dispatch,
  map,
  selectedLayers,
  tileLayerIds,
  vectorLayerIds,
  isAnalysisExposureLoading,
  selectedDate,
  adminLevelLayersData,
  removeLayerFromUrl,
  renderButtons,
}: LegendListProps) {
  const { t } = useSafeTranslation();

  // memoized values from selectors
  const featureCollection = React.useMemo(() => {
    return analysisResult?.featureCollection;
  }, [analysisResult]);

  const hasData = React.useMemo(() => {
    return featureCollection?.features
      ? featureCollection.features.length > 0
      : false;
  }, [featureCollection]);

  // If legend array is empty, we fetch from remote server the legend as GetLegendGraphic request.
  const getLayerLegendUrl = useCallback((layer: LayerType) => {
    return layer.type === 'wms' && layer.legend.length === 0
      ? createGetLegendGraphicUrl({
          base: layer.baseUrl,
          layer: layer.serverLayerName,
        })
      : undefined;
  }, []);

  const layersLegendItems = React.useMemo(() => {
    return layers.map(layer => {
      if (!layer.legend || !layer.legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }
      return (
        <LegendItem
          key={layer.id}
          id={layer.id}
          title={layer.title ? t(layer.title) : undefined}
          legend={layer.legend}
          legendUrl={getLayerLegendUrl(layer)}
          type={layer.type}
          opacity={layer.opacity}
          fillPattern={layer.fillPattern}
          extent={extent}
          dispatch={dispatch}
          map={map}
          selectedLayers={selectedLayers}
          tileLayerIds={tileLayerIds}
          vectorLayerIds={vectorLayerIds}
          isAnalysisExposureLoading={isAnalysisExposureLoading}
          selectedDate={selectedDate}
          adminLevelLayersData={adminLevelLayersData}
          removeLayerFromUrl={removeLayerFromUrl}
          renderButtons={renderButtons}
        >
          {t(layer.legendText)}
        </LegendItem>
      );
    });
  }, [
    adminLevelLayersData,
    dispatch,
    extent,
    getLayerLegendUrl,
    isAnalysisExposureLoading,
    layers,
    map,
    removeLayerFromUrl,
    renderButtons,
    selectedDate,
    selectedLayers,
    t,
    tileLayerIds,
    vectorLayerIds,
  ]);

  const renderedLegendImpactResult = React.useMemo(() => {
    if (!(analysisResult instanceof BaselineLayerResult)) {
      return null;
    }
    const baselineLayer = analysisResult.getBaselineLayer();
    const hazardLayer = analysisResult.getHazardLayer();
    return (
      <LegendImpactResult
        legendText={
          baselineLayer.legendText
            ? baselineLayer.legendText
            : hazardLayer.legendText
        }
        thresholdBelow={analysisResult.threshold.below}
        thresholdAbove={analysisResult.threshold.above}
      />
    );
  }, [analysisResult]);

  // add analysis legend item if layer is active and analysis result exists
  const analysisLegendItem = React.useMemo(() => {
    if (!isAnalysisLayerActive || !hasData) {
      return [];
    }
    return [
      <LegendItem
        key={analysisResult?.key ?? Date.now()}
        legend={analysisResult?.legend}
        title={analysisResult?.getTitle(t)}
        opacity={analysisLayerOpacity} // TODO: initial opacity value
        // Control opacity only for analysis
        // for the other layers it is controlled from the left panel
        isAnalysis={isAnalysisLayerActive && hasData}
        dispatch={dispatch}
        map={map}
        selectedLayers={selectedLayers}
        tileLayerIds={tileLayerIds}
        vectorLayerIds={vectorLayerIds}
        isAnalysisExposureLoading={isAnalysisExposureLoading}
        selectedDate={selectedDate}
        adminLevelLayersData={adminLevelLayersData}
        removeLayerFromUrl={removeLayerFromUrl}
        renderButtons={renderButtons}
      >
        {renderedLegendImpactResult}
      </LegendItem>,
    ];
  }, [
    adminLevelLayersData,
    analysisLayerOpacity,
    analysisResult,
    dispatch,
    hasData,
    isAnalysisExposureLoading,
    isAnalysisLayerActive,
    map,
    removeLayerFromUrl,
    renderButtons,
    renderedLegendImpactResult,
    selectedDate,
    selectedLayers,
    t,
    tileLayerIds,
    vectorLayerIds,
  ]);

  const legendItems = React.useMemo(() => {
    return [...layersLegendItems, ...analysisLegendItem];
  }, [analysisLegendItem, layersLegendItems]);

  return <List className={classes.list}>{legendItems}</List>;
}

const styles = () =>
  createStyles({
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '70vh',
      position: 'absolute',
      right: '16px',
    },
  });

export interface LegendListProps extends WithStyles<typeof styles> {
  layers: LayerType[];
  extent?: Extent;
  isAnalysisLayerActive: boolean;
  analysisResult: AnalysisResult | undefined;
  analysisLayerOpacity: number;
  dispatch: Dispatch<any>;
  map: maplibregl.Map | undefined;
  selectedLayers: LayerType[];
  tileLayerIds: string[];
  vectorLayerIds: string[];
  isAnalysisExposureLoading: boolean;
  selectedDate: number | undefined;
  adminLevelLayersData: LayerData<AdminLevelDataLayerProps>[];
  removeLayerFromUrl: Function;
  renderButtons?: boolean;
}

export default withStyles(styles)(LegendList);
