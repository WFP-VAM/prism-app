import React from 'react';
import { useSelector } from 'react-redux';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  invertedColorsSelector,
  isAnalysisLayerActiveSelector,
} from 'context/analysisResultStateSlice';
import { LayerType, LegendDefinitionItem } from 'config/types';
import { BaselineLayerResult } from 'utils/analysis-utils';
import useLayers from 'utils/layers-utils';
import { createGetLegendGraphicUrl } from 'prism-common';
import { useSafeTranslation } from 'i18n';
import { List } from '@material-ui/core';
import { Panel, leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import LegendItem from './LegendItem';
import LegendImpactResult from './LegendImpactResult';
import { isAnticipatoryActionAvailable } from '../LeftPanel/utils';
import AALegend from '../LeftPanel/AnticipatoryActionPanel/AALegend';

// Invert the colors of the legend, first color becomes last and vice versa
export const invertLegendColors = (
  legendItems: LegendDefinitionItem[],
): LegendDefinitionItem[] => {
  // eslint-disable-next-line
  const reversedColors = legendItems.map(item => item.color).reverse();
  return legendItems.map((item, index) => ({
    ...item,
    color: reversedColors[index],
  }));
};

interface LegendItemsListProps {
  forPrinting?: boolean;
  listStyle?: string;
  showDescription?: boolean;
}

function LegendItemsList({
  listStyle,
  forPrinting = false,
  showDescription = true,
}: LegendItemsListProps) {
  const { t } = useSafeTranslation();
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const invertedColorsForAnalysis = useSelector(invertedColorsSelector);
  const analysisLayerOpacity = useSelector(analysisResultOpacitySelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const { selectedLayers, adminBoundariesExtent } = useLayers();

  // If legend array is empty, we fetch from remote server the legend as GetLegendGraphic request.
  const getLayerLegendUrl = React.useCallback((layer: LayerType) => {
    return layer.type === 'wms' && layer.legend.length === 0
      ? createGetLegendGraphicUrl({
          base: layer.baseUrl,
          layer: layer.serverLayerName,
        })
      : undefined;
  }, []);

  // memoized values from selectors
  const featureCollection = React.useMemo(() => {
    return analysisResult?.featureCollection;
  }, [analysisResult]);

  const hasData = React.useMemo(() => {
    return featureCollection?.features
      ? featureCollection.features.length > 0
      : false;
  }, [featureCollection]);

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
        id="analysis"
        type="analysis"
        key={analysisResult?.key ?? Date.now()}
        legend={
          invertedColorsForAnalysis
            ? invertLegendColors(analysisResult?.legend || [])
            : analysisResult?.legend
        }
        title={analysisResult?.getTitle(t)}
        opacity={analysisLayerOpacity} // TODO: initial opacity value
        forPrinting={forPrinting}
        showDescription={showDescription}
      >
        {renderedLegendImpactResult}
      </LegendItem>,
    ];
  }, [
    isAnalysisLayerActive,
    hasData,
    analysisResult,
    invertedColorsForAnalysis,
    t,
    analysisLayerOpacity,
    forPrinting,
    showDescription,
    renderedLegendImpactResult,
  ]);

  const layersLegendItems = React.useMemo(() => {
    return selectedLayers.map(layer => {
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
          extent={adminBoundariesExtent}
          forPrinting={forPrinting}
          showDescription={showDescription}
        >
          {t(layer.legendText)}
        </LegendItem>
      );
    });
  }, [
    selectedLayers,
    t,
    getLayerLegendUrl,
    adminBoundariesExtent,
    forPrinting,
    showDescription,
  ]);

  const legendItems = React.useMemo(() => {
    const AALegends =
      isAnticipatoryActionAvailable && tabValue === Panel.AnticipatoryAction
        ? [
            <AALegend
              forPrinting={forPrinting}
              showDescription={showDescription}
            />,
          ]
        : [];
    return [...AALegends, ...layersLegendItems, ...analysisLegendItem].filter(
      (x): x is React.JSX.Element => x !== null,
    );
  }, [analysisLegendItem, forPrinting, layersLegendItems, tabValue]);

  return <List className={listStyle}>{legendItems}</List>;
}

export default LegendItemsList;
