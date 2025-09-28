import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AdminLevelDataLayerProps,
  AdminLevelType,
  AggregationOperations,
  BoundaryLayerProps,
  GeometryType,
  HazardDataType,
  LayerKey,
  RasterType,
  ThresholdDefinition,
  WMSLayerProps,
  ExposureValue,
  ExposureOperator,
} from 'config/types';
import {
  AnalysisDispatchParams,
  PolygonAnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  requestAndStorePolygonAnalysis,
} from 'context/analysisResultStateSlice';
import {
  mapSelector,
  layerDataSelector,
} from 'context/mapStateSlice/selectors';
import {
  availableDatesSelector,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';
import { LayerData } from 'context/layers/layer-data';
import { getAdminLevelLayer } from 'utils/admin-utils';
import { safeDispatchAddLayer, safeDispatchRemoveLayer } from 'utils/map-utils';
import useLayers from 'utils/layers-utils';
import { getPossibleDatesForLayer } from 'utils/server-utils';
import { getDateFromList } from 'utils/data-utils';
import { getFormattedDate } from 'utils/date-utils';
import { LayerDefinitions, getDisplayBoundaryLayers } from 'config/utils';
import type { AnalysisResult } from 'utils/analysis-utils';

export interface UseAnalysisFormOptions {
  initialHazardLayerId?: LayerKey;
  initialBaselineLayerId?: LayerKey;
  initialStartDate?: string;
  initialEndDate?: string;
  initialThreshold?: ThresholdDefinition;
  initialStat?: AggregationOperations;
}

export interface UseAnalysisFormReturn {
  // Form state
  hazardLayerId: LayerKey | undefined;
  setHazardLayerId: (id: LayerKey | undefined) => void;
  baselineLayerId: LayerKey | undefined;
  setBaselineLayerId: (id: LayerKey | undefined) => void;
  statistic: AggregationOperations;
  setStatistic: (stat: AggregationOperations) => void;
  selectedDate: number | null;
  setSelectedDate: (date: number | null) => void;
  startDate: number | null;
  setStartDate: (date: number | null) => void;
  endDate: number | null;
  setEndDate: (date: number | null) => void;
  belowThreshold: string;
  setBelowThreshold: (value: string) => void;
  aboveThreshold: string;
  setAboveThreshold: (value: string) => void;
  exposureValue: ExposureValue;
  setExposureValue: (value: ExposureValue) => void;
  adminLevel: AdminLevelType;
  setAdminLevel: (level: AdminLevelType) => void;

  // Derived values
  selectedHazardLayer: WMSLayerProps | null;
  hazardDataType: HazardDataType | null;
  adminLevelLayer: BoundaryLayerProps | null;
  adminLevelLayerData: LayerData<BoundaryLayerProps> | undefined;
  requiredThresholdNotSet: boolean;
  availableHazardDates: Date[];

  // Analysis state
  analysisResult: AnalysisResult | null | undefined;
  isAnalysisLoading: boolean;
}

/**
 * Shared hook for analysis form state management and derived calculations
 */
export const useAnalysisForm = (
  options: UseAnalysisFormOptions = {},
): UseAnalysisFormReturn => {
  const {
    initialHazardLayerId,
    initialBaselineLayerId,
    initialStartDate,
    initialThreshold,
    initialStat,
  } = options;

  const dispatch = useDispatch();
  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);

  // Form state
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey | undefined>(
    initialHazardLayerId,
  );
  const [baselineLayerId, setBaselineLayerId] = useState<LayerKey | undefined>(
    initialBaselineLayerId,
  );
  const [statistic, setStatistic] = useState<AggregationOperations>(
    initialStat || AggregationOperations.Mean,
  );
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);
  const [belowThreshold, setBelowThreshold] = useState(
    initialThreshold?.below?.toString() || '',
  );
  const [aboveThreshold, setAboveThreshold] = useState(
    initialThreshold?.above?.toString() || '',
  );
  const [exposureValue, setExposureValue] = useState<ExposureValue>({
    operator: ExposureOperator.EQUAL,
    value: '',
  });
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(1);

  // Derived values
  const selectedHazardLayer = useMemo(
    () =>
      hazardLayerId ? (LayerDefinitions[hazardLayerId] as WMSLayerProps) : null,
    [hazardLayerId],
  );

  const hazardDataType: HazardDataType | null = useMemo(
    () =>
      selectedHazardLayer
        ? selectedHazardLayer.geometry || RasterType.Raster
        : null,
    [selectedHazardLayer],
  );

  const adminLevelLayer = useMemo(
    () => getAdminLevelLayer(adminLevel),
    [adminLevel],
  );

  const adminLevelLayerData = useSelector(
    adminLevelLayer ? layerDataSelector(adminLevelLayer.id) : () => undefined,
  ) as LayerData<BoundaryLayerProps> | undefined;

  const requiredThresholdNotSet = useMemo(
    () =>
      Boolean(
        baselineLayerId &&
          LayerDefinitions[baselineLayerId]?.type === 'admin_level_data' &&
          !belowThreshold &&
          !aboveThreshold,
      ),
    [baselineLayerId, belowThreshold, aboveThreshold],
  );

  const availableHazardDates = useMemo(
    () =>
      selectedHazardLayer
        ? Array.from(
            new Set(
              getPossibleDatesForLayer(
                selectedHazardLayer,
                availableDates,
              )?.map(d => d.queryDate),
            ),
          ).map(d => new Date(d)) || []
        : [],
    [availableDates, selectedHazardLayer],
  );

  // Load available dates for selected hazard layer
  useEffect(() => {
    if (
      hazardLayerId !== undefined &&
      availableDates[hazardLayerId] === undefined
    ) {
      dispatch(loadAvailableDatesForLayer(hazardLayerId));
    }
  }, [availableDates, dispatch, hazardLayerId]);

  // Set default dates when hazard layer changes
  useEffect(() => {
    if (availableHazardDates.length > 0) {
      const lastAvailableDate =
        getDateFromList(
          initialStartDate ? new Date(initialStartDate) : null,
          availableHazardDates,
        )?.getTime() ||
        availableHazardDates[availableHazardDates.length - 1].getTime();

      if (hazardDataType === GeometryType.Polygon) {
        setStartDate(lastAvailableDate);
        setEndDate(lastAvailableDate);
      } else {
        setSelectedDate(lastAvailableDate);
      }
    }
  }, [availableHazardDates, hazardDataType, initialStartDate]);

  return {
    // Form state
    hazardLayerId,
    setHazardLayerId,
    baselineLayerId,
    setBaselineLayerId,
    statistic,
    setStatistic,
    selectedDate,
    setSelectedDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    belowThreshold,
    setBelowThreshold,
    aboveThreshold,
    setAboveThreshold,
    exposureValue,
    setExposureValue,
    adminLevel,
    setAdminLevel,

    // Derived values
    selectedHazardLayer,
    hazardDataType,
    adminLevelLayer,
    adminLevelLayerData,
    requiredThresholdNotSet,
    availableHazardDates,

    // Analysis state
    analysisResult,
    isAnalysisLoading,
  };
};

export interface UseAnalysisExecutionOptions {
  onUrlUpdate?: (params: any) => void;
  clearAnalysisFunction?: () => void;
}

export interface UseAnalysisExecutionReturn {
  runAnalyser: () => Promise<void>;
  scaleThreshold: (threshold: number) => number;
  activateUniqueBoundary: (forceAdminLevel?: BoundaryLayerProps) => void;
}

/**
 * Shared hook for analysis execution logic
 */
export const useAnalysisExecution = (
  formState: UseAnalysisFormReturn,
  options: UseAnalysisExecutionOptions = {},
): UseAnalysisExecutionReturn => {
  const { onUrlUpdate, clearAnalysisFunction } = options;
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const { adminBoundariesExtent: extent } = useLayers();

  const scaleThreshold = useCallback(
    (threshold: number) =>
      formState.statistic === AggregationOperations['Area exposed']
        ? threshold / 100
        : threshold,
    [formState.statistic],
  );

  const activateUniqueBoundary = useCallback(
    (forceAdminLevel?: BoundaryLayerProps) => {
      if (forceAdminLevel) {
        // Remove displayed boundaries
        getDisplayBoundaryLayers().forEach(l => {
          if (l.id !== forceAdminLevel.id) {
            safeDispatchRemoveLayer(map, l, dispatch);
          }
        });

        safeDispatchAddLayer(
          map,
          { ...forceAdminLevel, isPrimary: true },
          dispatch,
        );
        return;
      }

      if (!formState.baselineLayerId) {
        throw new Error('Layer should be selected to run analysis');
      }

      const baselineLayer = LayerDefinitions[
        formState.baselineLayerId
      ] as AdminLevelDataLayerProps;

      if (baselineLayer.boundary) {
        const boundaryLayer = LayerDefinitions[
          baselineLayer.boundary
        ] as BoundaryLayerProps;
        // Remove displayed boundaries
        getDisplayBoundaryLayers().forEach(l => {
          if (l.id !== boundaryLayer.id) {
            safeDispatchRemoveLayer(map, l, dispatch);
          }
        });

        safeDispatchAddLayer(
          map,
          { ...boundaryLayer, isPrimary: true },
          dispatch,
        );
      } else {
        getDisplayBoundaryLayers().forEach(l => {
          safeDispatchAddLayer(map, l, dispatch);
        });
      }
    },
    [formState.baselineLayerId, dispatch, map],
  );

  const runAnalyser = useCallback(async () => {
    if (formState.analysisResult) {
      if (clearAnalysisFunction) {
        clearAnalysisFunction();
      } else {
        dispatch(clearAnalysisResult());
      }
    }

    if (!extent) {
      return; // hasn't been calculated yet
    }

    if (!formState.selectedHazardLayer) {
      throw new Error('Hazard layer should be selected to run analysis');
    }

    if (formState.hazardDataType === GeometryType.Polygon) {
      if (!formState.startDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!formState.endDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!formState.adminLevelLayer || !formState.adminLevelLayerData) {
        throw new Error('Admin level data is still loading');
      }

      const params: PolygonAnalysisDispatchParams = {
        hazardLayer: formState.selectedHazardLayer,
        adminLevel: formState.adminLevel,
        adminLevelLayer: formState.adminLevelLayer,
        adminLevelData: formState.adminLevelLayerData.data,
        startDate: formState.startDate,
        endDate: formState.endDate,
        extent,
      };

      activateUniqueBoundary(formState.adminLevelLayer);

      if (onUrlUpdate) {
        onUrlUpdate({
          analysisHazardLayerId: formState.hazardLayerId,
          analysisAdminLevel: formState.adminLevel.toString(),
          analysisStartDate: getFormattedDate(formState.startDate, 'default'),
          analysisEndDate: getFormattedDate(formState.endDate, 'default'),
          analysisStatistic: formState.statistic,
        });
      }

      dispatch(requestAndStorePolygonAnalysis(params));
    } else {
      if (!formState.selectedDate) {
        throw new Error('Date must be given to run analysis');
      }

      if (!formState.baselineLayerId) {
        throw new Error('Baseline layer should be selected to run analysis');
      }

      const selectedBaselineLayer = LayerDefinitions[
        formState.baselineLayerId
      ] as AdminLevelDataLayerProps;

      activateUniqueBoundary();

      const params: AnalysisDispatchParams = {
        hazardLayer: formState.selectedHazardLayer,
        baselineLayer: selectedBaselineLayer,
        date: formState.selectedDate,
        statistic: formState.statistic,
        exposureValue: formState.exposureValue,
        extent,
        threshold: {
          above:
            scaleThreshold(parseFloat(formState.aboveThreshold)) || undefined,
          below:
            scaleThreshold(parseFloat(formState.belowThreshold)) || undefined,
        },
      };

      if (onUrlUpdate) {
        onUrlUpdate({
          analysisHazardLayerId: formState.hazardLayerId,
          analysisBaselineLayerId: formState.baselineLayerId,
          analysisDate: getFormattedDate(formState.selectedDate, 'default'),
          analysisStatistic: formState.statistic,
          analysisThresholdAbove: formState.aboveThreshold || undefined,
          analysisThresholdBelow: formState.belowThreshold || undefined,
        });
      }

      dispatch(requestAndStoreAnalysis(params));
    }
  }, [
    formState,
    extent,
    dispatch,
    activateUniqueBoundary,
    scaleThreshold,
    onUrlUpdate,
    clearAnalysisFunction,
  ]);

  return {
    runAnalyser,
    scaleThreshold,
    activateUniqueBoundary,
  };
};
