import { getProperties } from 'components/MapView/utils';
import { appConfig } from 'config';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
  ChartConfig,
  ChartLatestPeriod,
  DatasetField,
  LayerKey,
  WMSLayerProps,
} from 'config/types';
import { getBoundaryLayersByAdminLevel, LayerDefinitions } from 'config/utils';
import {
  AdminBoundaryRequestParams,
  CHART_DATA_PREFIXES,
  loadAdminBoundaryDataset,
} from 'context/datasetStateSlice';
import { LayerData } from 'context/layers/layer-data';
import {
  availableDatesSelector,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';
import { TableData } from 'context/tableStateSlice';
import { GeoJsonProperties } from 'geojson';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getChartAdminBoundaryParams } from 'utils/admin-utils';
import { getLatestPeriodRange, getTimeInMilliseconds } from 'utils/date-utils';
import { getPossibleDatesForLayer } from 'utils/server-utils';

import { useBoundaryData } from './useBoundaryData';

const { multiCountry, countryAdmin0Id } = appConfig;
const MAX_ADMIN_LEVEL = multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

// Default date range: last 1 year
const yearsToFetchDataFor = 1;
const oneYearInMs = 365 * 24 * 60 * 60 * 1000;

export interface UseChartFormOptions {
  initialChartLayerId?: LayerKey;
  initialStartDate?: string;
  initialEndDate?: string;
  initialAdminLevel?: AdminLevelType;
  initialAdminUnitId?: string | number;
  useLatestAvailableDate?: boolean;
  latestPeriod?: ChartLatestPeriod;
}

/**
 * Resolves the persisted admin unit id (the boundary code that getProperties
 * uses on restore) for the currently-selected level.
 *
 * In multi-country deployments the hierarchy is country (0) -> admin 1 (1) ->
 * admin 2 (2), so level 0 stores the selected country. In single-country
 * deployments level 0 is the whole country and has no admin unit id.
 */
export function adminUnitIdFromKeys(
  admin0Key: AdminCodeString,
  admin1Key: AdminCodeString,
  admin2Key: AdminCodeString,
  level: AdminLevelType,
): string | undefined {
  if (level === 2 && admin2Key) {
    return String(admin2Key);
  }
  if (level === 1 && admin1Key) {
    return String(admin1Key);
  }
  if (level === 0) {
    return multiCountry && admin0Key ? String(admin0Key) : undefined;
  }
  return undefined;
}

/**
 * Rebuilds the admin key hierarchy (country / admin 1 / admin 2) from a restored
 * boundary feature's properties, accounting for the multi-country level offset.
 */
export function deriveAdminKeysFromProperties(
  properties: GeoJsonProperties,
  level: AdminLevelType,
  deepestCode: string,
  adminLevelCodes: string[],
): {
  admin0Key: AdminCodeString;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
} {
  const empty = '' as AdminCodeString;
  const admin0CodeField = adminLevelCodes[0];
  const admin1CodeField = adminLevelCodes[multiCountry ? 1 : 0];

  const restoredAdmin0 = multiCountry
    ? ((properties?.[admin0CodeField] ?? '') as AdminCodeString)
    : empty;

  if (level === 0) {
    return {
      admin0Key: multiCountry ? (deepestCode as AdminCodeString) : empty,
      admin1Key: empty,
      admin2Key: empty,
    };
  }
  if (level === 1) {
    return {
      admin0Key: restoredAdmin0,
      admin1Key: deepestCode as AdminCodeString,
      admin2Key: empty,
    };
  }
  return {
    admin0Key: restoredAdmin0,
    admin1Key: (properties?.[admin1CodeField] ?? '') as AdminCodeString,
    admin2Key: deepestCode as AdminCodeString,
  };
}

export interface UseChartFormReturn {
  // Form state
  chartLayerId: LayerKey | undefined;
  setChartLayerId: (id: LayerKey | undefined) => void;
  admin0Key: AdminCodeString;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
  adminLevel: AdminLevelType;
  setLocation: (
    admin0Key: AdminCodeString,
    admin1Key: AdminCodeString,
    admin2Key: AdminCodeString,
    properties: GeoJsonProperties,
    adminLevel: AdminLevelType,
  ) => void;
  startDate: number | null;
  setStartDate: (date: number | null) => void;
  endDate: number | null;
  setEndDate: (date: number | null) => void;
  adminProperties: GeoJsonProperties | undefined;
  setAdminProperties: (props: GeoJsonProperties | undefined) => void;

  // Derived values
  selectedChartLayer: WMSLayerProps | null;
  boundaryLayerData: LayerData<BoundaryLayerProps> | undefined;
  boundaryLayer: BoundaryLayerProps;
  isLatestDateReady: boolean;
}

/**
 * Hook for managing chart form state
 */
export const useChartForm = (
  options: UseChartFormOptions = {},
): UseChartFormReturn => {
  const {
    initialChartLayerId,
    initialStartDate,
    initialEndDate,
    initialAdminLevel,
    initialAdminUnitId,
    useLatestAvailableDate = false,
    latestPeriod = ChartLatestPeriod.MONTH,
  } = options;

  const dispatch = useDispatch();
  const availableDates = useSelector(availableDatesSelector);
  const hasRestoredAdminRef = useRef(false);

  // Form state
  const [chartLayerId, setChartLayerId] = useState<LayerKey | undefined>(
    initialChartLayerId,
  );
  const [admin0Key, setAdmin0Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [admin1Key, setAdmin1Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [admin2Key, setAdmin2Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(
    initialAdminLevel ?? (countryAdmin0Id ? 0 : 1),
  );
  const [startDate, setStartDate] = useState<number | null>(
    initialStartDate
      ? getTimeInMilliseconds(initialStartDate)
      : new Date().getTime() - oneYearInMs * yearsToFetchDataFor,
  );
  const [endDate, setEndDate] = useState<number | null>(() => {
    if (initialEndDate) {
      return getTimeInMilliseconds(initialEndDate);
    }
    // If no endDate provided but we have a startDate, default to 1 years after start
    if (initialStartDate) {
      return getTimeInMilliseconds(initialStartDate) + oneYearInMs * 1;
    }
    // Otherwise default to today
    return new Date().getTime();
  });
  const [adminProperties, setAdminProperties] = useState<
    GeoJsonProperties | undefined
  >(undefined);

  const setLocationInternal = (
    newAdmin0Key: AdminCodeString,
    newAdmin1Key: AdminCodeString,
    newAdmin2Key: AdminCodeString,
    properties: GeoJsonProperties,
    level: AdminLevelType,
  ) => {
    setAdmin0Key(newAdmin0Key);
    setAdmin1Key(newAdmin1Key);
    setAdmin2Key(newAdmin2Key);
    setAdminLevel(level);
    setAdminProperties(properties);
  };

  const setLocation = (
    newAdmin0Key: AdminCodeString,
    newAdmin1Key: AdminCodeString,
    newAdmin2Key: AdminCodeString,
    properties: GeoJsonProperties,
    level: AdminLevelType,
  ) => {
    setLocationInternal(
      newAdmin0Key,
      newAdmin1Key,
      newAdmin2Key,
      properties,
      level,
    );
  };

  const boundaryDataResult = useBoundaryData(boundaryLayer.id);

  // Adapt to LayerData format for compatibility
  const boundaryLayerData: LayerData<BoundaryLayerProps> | undefined =
    useMemo(() => {
      if (!boundaryDataResult.data) {
        return undefined;
      }
      return {
        layer: boundaryLayer,
        data: boundaryDataResult.data,
        date: Date.now(),
      };
    }, [boundaryDataResult.data]);

  // Derived values
  const selectedChartLayer = useMemo(
    () =>
      chartLayerId ? (LayerDefinitions[chartLayerId] as WMSLayerProps) : null,
    [chartLayerId],
  );

  useEffect(() => {
    hasRestoredAdminRef.current = false;
  }, [initialAdminUnitId, initialAdminLevel]);

  // Restore admin unit selection from saved dashboard config
  useEffect(() => {
    if (
      hasRestoredAdminRef.current ||
      !boundaryLayerData?.data ||
      initialAdminUnitId === undefined ||
      initialAdminUnitId === null ||
      initialAdminUnitId === ''
    ) {
      return;
    }

    const level = (initialAdminLevel ?? 0) as AdminLevelType;
    const code = String(initialAdminUnitId) as AdminCodeString;
    const properties = getProperties(boundaryLayerData.data, code, level);
    const {
      admin0Key: restoredAdmin0,
      admin1Key: restoredAdmin1,
      admin2Key: restoredAdmin2,
    } = deriveAdminKeysFromProperties(
      properties,
      level,
      String(initialAdminUnitId),
      boundaryLayer.adminLevelCodes,
    );

    hasRestoredAdminRef.current = true;
    setLocationInternal(
      restoredAdmin0,
      restoredAdmin1,
      restoredAdmin2,
      properties,
      level,
    );
  }, [
    boundaryLayerData,
    initialAdminUnitId,
    initialAdminLevel,
    boundaryLayer.adminLevelCodes,
  ]);

  // Initialize admin properties if we have boundary data and countryAdmin0Id
  useEffect(() => {
    if (
      hasRestoredAdminRef.current ||
      adminProperties ||
      !countryAdmin0Id ||
      !boundaryLayerData?.data
    ) {
      return;
    }
    setAdminProperties(getProperties(boundaryLayerData.data));
  }, [adminProperties, boundaryLayerData]);

  // Ensure adminLevel matches what's actually selected
  useEffect(() => {
    const getExpectedLevel = (): AdminLevelType => {
      if (admin2Key) {
        return 2 as AdminLevelType;
      }
      if (admin1Key) {
        return 1 as AdminLevelType;
      }
      return 0 as AdminLevelType;
    };

    const expectedLevel = getExpectedLevel();
    if (adminLevel !== expectedLevel) {
      setAdminLevel(expectedLevel);
    }
  }, [admin1Key, admin2Key, adminLevel]);

  useEffect(() => {
    if (
      useLatestAvailableDate &&
      chartLayerId &&
      availableDates[chartLayerId] === undefined
    ) {
      dispatch(loadAvailableDatesForLayer(chartLayerId));
    }
  }, [useLatestAvailableDate, chartLayerId, availableDates, dispatch]);

  const latestRange = useMemo(() => {
    if (!useLatestAvailableDate || !selectedChartLayer) {
      return null;
    }
    const possibleDates = getPossibleDatesForLayer(
      selectedChartLayer,
      availableDates,
    );
    if (!possibleDates?.length) {
      return null;
    }
    const latestDate = possibleDates[possibleDates.length - 1].displayDate;
    return getLatestPeriodRange(latestDate, latestPeriod);
  }, [
    useLatestAvailableDate,
    selectedChartLayer,
    availableDates,
    latestPeriod,
  ]);

  const effectiveStartDate =
    useLatestAvailableDate && latestRange ? latestRange.startDate : startDate;
  const effectiveEndDate =
    useLatestAvailableDate && latestRange ? latestRange.endDate : endDate;
  const isLatestDateReady = !useLatestAvailableDate || latestRange !== null;

  return {
    // Form state
    chartLayerId,
    setChartLayerId,
    admin0Key,
    admin1Key,
    admin2Key,
    adminLevel,
    setLocation,
    startDate: effectiveStartDate,
    setStartDate,
    endDate: effectiveEndDate,
    setEndDate,
    adminProperties,
    setAdminProperties,

    // Derived values
    selectedChartLayer,
    boundaryLayerData,
    boundaryLayer,
    isLatestDateReady,
  };
};

export interface UseChartDataOptions {
  chartLayer: WMSLayerProps | null;
  adminProperties: GeoJsonProperties | undefined;
  adminLevel: AdminLevelType;
  startDate: number | null;
  endDate: number | null;
  enabled?: boolean;
}

export interface UseChartDataReturn {
  chartDataset: TableData | undefined;
  isLoading: boolean;
  error: string | undefined;
  chartConfig: ChartConfig | null;
  chartTitle: string;
  chartSubtitle: string;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing chart data
 */
export const useChartData = (
  options: UseChartDataOptions,
): UseChartDataReturn => {
  const {
    chartLayer,
    adminProperties,
    adminLevel,
    startDate,
    endDate,
    enabled = true,
  } = options;

  const dispatch = useDispatch();
  const { i18n: i18nLocale } = useSafeTranslation();
  const [chartDataset, setChartDataset] = useState<TableData | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const requestParams = useMemo<AdminBoundaryRequestParams | null>(() => {
    if (
      !chartLayer ||
      !adminProperties ||
      !chartLayer.chartData ||
      startDate === null ||
      endDate === null
    ) {
      return null;
    }

    const params = getChartAdminBoundaryParams(chartLayer, adminProperties);
    const { levels } = chartLayer.chartData;
    const levelsDict = Object.fromEntries(levels.map(x => [x.level, x.id]));
    const adminKey = levelsDict[adminLevel.toString()];

    const { code: adminCode } = params.boundaryProps[adminKey] || {
      code: appConfig.countryAdmin0Id,
    };

    return {
      ...params,
      level: adminLevel.toString(),
      adminCode: adminCode || appConfig.countryAdmin0Id,
      startDate,
      endDate,
    };
  }, [chartLayer, adminProperties, adminLevel, startDate, endDate]);

  const fetchData = useCallback(async () => {
    if (!requestParams || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(undefined);
    setChartDataset(undefined);

    try {
      const results = await loadAdminBoundaryDataset(requestParams, dispatch);

      if (!results) {
        setError('No data available');
        return;
      }

      setChartDataset(results);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [requestParams, enabled, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartConfig = useMemo<ChartConfig | null>(() => {
    if (!chartLayer?.chartData || !requestParams) {
      return null;
    }

    const { type: chartType, fields: datasetFields } = chartLayer.chartData;
    const colors = datasetFields?.map(row => row.color);

    const minValue = Math.min(
      ...(datasetFields
        ?.filter((row: DatasetField) => row?.minValue !== undefined)
        .map((row: DatasetField) => row.minValue) as number[]),
    );

    const maxValue = Math.max(
      ...(datasetFields
        ?.filter((row: DatasetField) => row?.maxValue !== undefined)
        .map((row: DatasetField) => row.maxValue) as number[]),
    );

    return {
      type: chartType,
      stacked: false,
      category: CHART_DATA_PREFIXES.date,
      data: CHART_DATA_PREFIXES.col,
      transpose: true,
      displayLegend: true,
      minValue: !Number.isFinite(minValue) ? undefined : minValue,
      maxValue: !Number.isFinite(maxValue) ? undefined : maxValue,
      colors,
    };
  }, [chartLayer, requestParams]);

  const chartTitle = useMemo(
    () => chartLayer?.title || '',
    [chartLayer?.title],
  );

  const chartSubtitle = useMemo(() => {
    if (!adminProperties || !requestParams || !chartLayer?.chartData) {
      return appConfig.country;
    }

    const { levels } = chartLayer.chartData;
    const levelsDict = Object.fromEntries(levels.map(x => [x.level, x.id]));
    const adminKey = levelsDict[adminLevel.toString()];

    // Check if we actually have valid admin data at this level
    const boundaryProp = requestParams.boundaryProps[adminKey];
    if (!boundaryProp || !boundaryProp.code) {
      // No valid admin data at this level, default to country
      if (isEnglishLanguageSelected(i18nLocale)) {
        return appConfig.country;
      }
      return appConfig.country;
    }

    const { name: adminName, localName: adminLocalName } = boundaryProp;

    if (isEnglishLanguageSelected(i18nLocale)) {
      return adminName || appConfig.country;
    }
    return adminLocalName || appConfig.country;

    // i18nLocale does not trigger a refresh. resolvedLanguage does
  }, [
    adminProperties,
    requestParams,
    chartLayer,
    adminLevel,
    i18nLocale.resolvedLanguage,
  ]);

  return {
    chartDataset,
    isLoading,
    error,
    chartConfig,
    chartTitle,
    chartSubtitle,
    refetch: fetchData,
  };
};
