import { useMemo } from 'react';
import bbox from '@turf/bbox';
import { useDispatch, useSelector } from 'react-redux';
import { Extent } from '../components/MapView/Layers/raster-utils';
import { layerDataSelector } from '../context/mapStateSlice/selectors';
import { LayerData } from '../context/layers/layer-data';
import {
  AggregationOperations,
  BoundaryLayerProps,
  NSOLayerProps,
  WMSLayerProps,
} from '../config/types';
import { getBoundaryLayerSingleton, LayerDefinitions } from '../config/utils';
import {
  AnalysisDispatchParams,
  requestAndStoreAnalysis,
} from '../context/analysisResultStateSlice';

export default function useAnalysisDispatch() {
  const dispatch = useDispatch();
  const boundaryLayerData = useSelector(
    layerDataSelector(getBoundaryLayerSingleton().id),
  ) as LayerData<BoundaryLayerProps> | undefined;

  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData) {
      // not loaded yet. Should be loaded in MapView
      return null;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  return async (
    selectedDate: number | null,
    hazardLayerId: WMSLayerProps['id'] | undefined,
    baselineLayerId: NSOLayerProps['id'] | undefined,
    statistic: AggregationOperations,
    aboveThreshold: string, // both must be float as string
    belowThreshold: string,
  ) => {
    if (!adminBoundariesExtent) {
      return;
    } // hasn't been calculated yet

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    if (!hazardLayerId || !baselineLayerId) {
      throw new Error('Layer should be selected to run analysis');
    }

    const selectedHazardLayer = LayerDefinitions[
      hazardLayerId
    ] as WMSLayerProps;
    const selectedBaselineLayer = LayerDefinitions[
      baselineLayerId
    ] as NSOLayerProps;

    const params: AnalysisDispatchParams = {
      hazardLayer: selectedHazardLayer,
      baselineLayer: selectedBaselineLayer,
      date: selectedDate,
      statistic,
      extent: adminBoundariesExtent,
      threshold: {
        above: parseFloat(aboveThreshold) || undefined,
        below: parseFloat(belowThreshold) || undefined,
      },
    };

    await dispatch(requestAndStoreAnalysis(params));
  };
}
