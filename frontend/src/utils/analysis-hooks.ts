import {
  AdminLevelDataLayerProps,
  AdminLevelType,
  AggregationOperations,
  BoundaryLayerProps,
  ExposureOperator,
  ExposureValue,
  GeometryType,
  HazardDataType,
  LayerKey,
  RasterType,
  ThresholdDefinition,
  WMSLayerProps,
} from 'config/types';
import { LayerDefinitions } from 'config/utils';
import {
  AnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  generatePolygonCacheKey,
  generateRasterCacheKey,
  getCachedAnalysisResult,
  isAnalysisLoadingSelector,
  PolygonAnalysisDispatchParams,
  requestAndStoreAnalysis,
  requestAndStorePolygonAnalysis,
} from 'context/analysisResultStateSlice';
import { LayerData } from 'context/layers/layer-data';
import { mapSelector } from 'context/mapStateSlice/selectors';
import {
  availableDatesSelector,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AnalysisResult } from 'utils/analysis-utils';
import { getDateFromList, parseNumberOrUndefined } from 'utils/data-utils';
import { getFormattedDate } from 'utils/date-utils';
import useLayers from 'utils/layers-utils';
import { safeDispatchAddLayer, safeDispatchRemoveLayer } from 'utils/map-utils';
import { getPossibleDatesForLayer } from 'utils/server-utils';
import { getAnalysisBoundaryLayersForIso3 } from 'utils/universal-country-admin';
import { getDisplayBoundaryLayersForIso3 } from 'utils/universal-utils';

import { useBoundaryData } from './useBoundaryData';

export interface UseAnalysisFormOptions {
  initialHazardLayerId?: LayerKey;
  initialBaselineLayerId?: LayerKey;
  initialStartDate?: string;
  initialEndDate?: string;
  initialThreshold?: ThresholdDefinition;
  initialStat?: AggregationOperations;
  useCache?: boolean; // If true, use cache if available, otherwise fetch fresh data
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
  // Cache control
  useCache: boolean;
}

const getCacheKey = (
  useCache: boolean,
  hazardLayerId: LayerKey | undefined,
  hazardDataType: HazardDataType | null,
  startDate: number | null,
  endDate: number | null,
  adminLevel: AdminLevelType,
  adminLevelLayer: BoundaryLayerProps | null,
  adminLevelLayerData: LayerData<BoundaryLayerProps> | undefined,
  baselineLayerId: LayerKey | undefined,
  selectedDate: number | null,
  statistic: AggregationOperations,
  aboveThreshold: string,
  belowThreshold: string,
  exposureValue: ExposureValue,
) => {
  // Skip cache key generation if bypassing cache or no hazard layer selected
  if (!useCache || !hazardLayerId) {
    return undefined;
  }

  if (hazardDataType === GeometryType.Polygon) {
    // Polygon analysis cache key
    if (
      !startDate ||
      !endDate ||
      !adminLevel ||
      !adminLevelLayer ||
      !adminLevelLayerData
    ) {
      return undefined;
    }
    const hazardLayer = LayerDefinitions[hazardLayerId];
    if (!hazardLayer) {
      return undefined;
    }
    return generatePolygonCacheKey({
      hazardLayer: hazardLayer as any,
      adminLevel,
      adminLevelLayer,
      adminLevelData: adminLevelLayerData.data as any,
      extent: [0, 0, 0, 0], // Placeholder - actual extent is constant (appConfig.map.boundingBox)
      startDate,
      endDate,
    });
  }

  // Raster analysis cache key
  if (!baselineLayerId || !selectedDate || !statistic) {
    return undefined;
  }
  const hazardLayer = LayerDefinitions[hazardLayerId];
  const baselineLayer = LayerDefinitions[baselineLayerId];
  if (!hazardLayer || !baselineLayer) {
    return undefined;
  }
  return generateRasterCacheKey({
    hazardLayer: hazardLayer as any,
    baselineLayer: baselineLayer as any,
    date: selectedDate,
    statistic,
    threshold: {
      above: aboveThreshold ? parseFloat(aboveThreshold) : undefined,
      below: belowThreshold ? parseFloat(belowThreshold) : undefined,
    },
    exposureValue,
    extent: [0, 0, 0, 0], // Placeholder - actual extent is constant (appConfig.map.boundingBox)
  });
};

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
    useCache = true,
  } = options;

  const dispatch = useDispatch();
  const { iso3 } = useCountryIso();
  const availableDates = useSelector(availableDatesSelector);
  const currentResult = useSelector(analysisResultSelector);
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

  const adminLevelLayer = useMemo(() => {
    const boundaryLayers = getAnalysisBoundaryLayersForIso3(iso3);
    return (
      boundaryLayers.find(
        layer => layer.adminLevelNames.length === adminLevel,
      ) || boundaryLayers[0]
    );
  }, [adminLevel, iso3]);

  const boundaryDataResult = useBoundaryData(adminLevelLayer?.id || '');

  const adminLevelLayerData: LayerData<BoundaryLayerProps> | undefined =
    boundaryDataResult.data && adminLevelLayer
      ? {
          layer: adminLevelLayer,
          data: boundaryDataResult.data,
          date: Date.now(),
        }
      : undefined;

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
    if (hazardLayerId && availableDates[hazardLayerId] === undefined) {
      dispatch(loadAvailableDatesForLayer(hazardLayerId));
    }
  }, [availableDates, dispatch, hazardLayerId]);

  // Set default dates when hazard layer changes
  useEffect(() => {
    // Normalize initialStartDate to 12:00:00 UTC to match how availableHazardDates are created
    const normalizedInitialDate = initialStartDate
      ? new Date(new Date(initialStartDate).setUTCHours(12, 0, 0, 0)).getTime()
      : null;
    if (availableHazardDates.length > 0) {
      const lastAvailableDate =
        getDateFromList(
          normalizedInitialDate,
          availableHazardDates.map(d => d.getTime()),
        ) || availableHazardDates[availableHazardDates.length - 1].getTime();

      if (hazardDataType === GeometryType.Polygon) {
        setStartDate(lastAvailableDate);
        setEndDate(lastAvailableDate);
      } else {
        setSelectedDate(lastAvailableDate);
      }
    }
  }, [availableHazardDates, hazardDataType, initialStartDate]);

  const cacheKey = useMemo(
    () =>
      getCacheKey(
        useCache,
        hazardLayerId,
        hazardDataType,
        startDate,
        endDate,
        adminLevel,
        adminLevelLayer,
        adminLevelLayerData,
        baselineLayerId,
        selectedDate,
        statistic,
        aboveThreshold,
        belowThreshold,
        exposureValue,
      ),
    [
      useCache,
      hazardLayerId,
      hazardDataType,
      startDate,
      endDate,
      adminLevel,
      adminLevelLayer,
      adminLevelLayerData,
      baselineLayerId,
      selectedDate,
      statistic,
      aboveThreshold,
      belowThreshold,
      exposureValue,
    ],
  );
  const selectCachedResult = useMemo(
    () => getCachedAnalysisResult(cacheKey),
    [cacheKey],
  );
  const cachedResult = useSelector(selectCachedResult);
  const analysisResult = currentResult ?? cachedResult;

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
    useCache,
  };
};

export interface UseAnalysisExecutionOptions {
  onUrlUpdate?: (params: any) => void;
  clearAnalysisFunction?: () => void;
  clearOnUnmount: boolean; // Whether to clear analysis results on component unmount
}

export interface UseAnalysisExecutionReturn {
  runAnalyser: () => Promise<void>;
  scaleThreshold: (threshold: number) => number;
  activateUniqueBoundary: (forceAdminLevel?: BoundaryLayerProps) => void;
  hasFormChanged: boolean;
  /** Resets run-button snapshot; pair with Redux clear when clearing outside runAnalyser */
  resetLastExecutedForm: () => void;
}

const getFormStateSnapshot = (formState: UseAnalysisFormReturn) =>
  JSON.stringify({
    hazardLayerId: formState.hazardLayerId,
    baselineLayerId: formState.baselineLayerId,
    selectedDate: formState.selectedDate,
    startDate: formState.startDate,
    endDate: formState.endDate,
    statistic: formState.statistic,
    aboveThreshold: formState.aboveThreshold,
    belowThreshold: formState.belowThreshold,
    exposureValue: formState.exposureValue,
    adminLevel: formState.adminLevel,
  });

/**
 * Shared hook for analysis execution logic
 */
export const useAnalysisExecution = (
  formState: UseAnalysisFormReturn,
  options: UseAnalysisExecutionOptions,
): UseAnalysisExecutionReturn => {
  const { onUrlUpdate, clearAnalysisFunction, clearOnUnmount } = options;
  const dispatch = useDispatch();
  const { iso3 } = useCountryIso();
  const map = useSelector(mapSelector);
  const { adminBoundariesExtent: extent } = useLayers();

  // Track if component is mounted to prevent updates after unmount
  const isMountedRef = useRef(true);

  // Store the current analysis request promise (which has an abort method added by Redux Toolkit)
  const analysisRequestRef = useRef<any>(null);

  // Track form state at last execution
  const lastExecutedFormRef = useRef<string | null>(null);

  const invokeClearAnalysis = useCallback(() => {
    lastExecutedFormRef.current = null;
    if (clearAnalysisFunction) {
      clearAnalysisFunction();
    } else {
      dispatch(clearAnalysisResult());
    }
  }, [clearAnalysisFunction, dispatch]);

  // Cleanup on unmount - abort any pending analysis and clear results
  useEffect(
    () => () => {
      isMountedRef.current = false;

      // Only clear if clearOnUnmount is enabled
      if (clearOnUnmount) {
        if (analysisRequestRef.current) {
          analysisRequestRef.current.abort();
          analysisRequestRef.current = null;
        }
        invokeClearAnalysis();
      }
    },
    [invokeClearAnalysis, clearOnUnmount],
  );

  // Check if form has changed since last execution
  const hasFormChanged = useMemo(() => {
    const currentFormSnapshot = getFormStateSnapshot(formState);

    return (
      lastExecutedFormRef.current === null ||
      lastExecutedFormRef.current !== currentFormSnapshot
    );
  }, [formState]);

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
        getDisplayBoundaryLayersForIso3(iso3).forEach(l => {
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
        getDisplayBoundaryLayersForIso3(iso3).forEach(l => {
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
        getDisplayBoundaryLayersForIso3(iso3).forEach(l => {
          safeDispatchAddLayer(map, l, dispatch);
        });
      }
    },
    [formState.baselineLayerId, dispatch, map, iso3],
  );

  const runAnalyser = useCallback(async () => {
    // Capture current form state at execution
    lastExecutedFormRef.current = getFormStateSnapshot(formState);

    if (formState.analysisResult) {
      invokeClearAnalysis();
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
        useCache: formState.useCache,
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

      // Dispatch and store the request so we can abort it if needed
      analysisRequestRef.current = dispatch(
        requestAndStorePolygonAnalysis(params),
      );
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

      // Parse and scale thresholds, handling 0 as a valid value
      const aboveThresholdValue = parseNumberOrUndefined(
        formState.aboveThreshold,
      );
      const belowThresholdValue = parseNumberOrUndefined(
        formState.belowThreshold,
      );

      const params: AnalysisDispatchParams = {
        hazardLayer: formState.selectedHazardLayer,
        baselineLayer: selectedBaselineLayer,
        date: formState.selectedDate,
        statistic: formState.statistic,
        exposureValue: formState.exposureValue,
        useCache: formState.useCache,
        extent,
        threshold: {
          above:
            aboveThresholdValue !== undefined
              ? scaleThreshold(aboveThresholdValue)
              : undefined,
          below:
            belowThresholdValue !== undefined
              ? scaleThreshold(belowThresholdValue)
              : undefined,
        },
      };

      if (onUrlUpdate) {
        onUrlUpdate({
          analysisHazardLayerId: formState.hazardLayerId,
          analysisBaselineLayerId: formState.baselineLayerId,
          analysisDate: getFormattedDate(formState.selectedDate, 'default'),
          analysisStatistic: formState.statistic,
          analysisThresholdAbove:
            aboveThresholdValue !== undefined
              ? formState.aboveThreshold
              : undefined,
          analysisThresholdBelow:
            belowThresholdValue !== undefined
              ? formState.belowThreshold
              : undefined,
        });
      }

      // Dispatch and store the request so we can abort it if needed
      analysisRequestRef.current = dispatch(requestAndStoreAnalysis(params));
    }
  }, [
    formState,
    extent,
    dispatch,
    activateUniqueBoundary,
    scaleThreshold,
    onUrlUpdate,
    invokeClearAnalysis,
  ]);

  const resetLastExecutedForm = useCallback(() => {
    lastExecutedFormRef.current = null;
  }, []);

  return {
    runAnalyser,
    scaleThreshold,
    activateUniqueBoundary,
    hasFormChanged,
    resetLastExecutedForm,
  };
};
