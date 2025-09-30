import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GeoJsonProperties } from 'geojson';
import { appConfig } from 'config';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
  ChartConfig,
  DatasetField,
  LayerKey,
  WMSLayerProps,
} from 'config/types';
import {
  AdminBoundaryRequestParams,
  CHART_DATA_PREFIXES,
  loadAdminBoundaryDataset,
} from 'context/datasetStateSlice';
import { TableData } from 'context/tableStateSlice';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { getChartAdminBoundaryParams } from 'utils/admin-utils';
import { getTimeInMilliseconds } from 'utils/date-utils';
import { LayerDefinitions, getBoundaryLayersByAdminLevel } from 'config/utils';
import { getProperties } from 'components/MapView/utils';

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
}

export interface UseChartFormReturn {
  // Form state
  chartLayerId: LayerKey | undefined;
  setChartLayerId: (id: LayerKey | undefined) => void;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
  adminLevel: AdminLevelType;
  setLocation: (
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
  } = options;

  // Form state
  const [chartLayerId, setChartLayerId] = useState<LayerKey | undefined>(
    initialChartLayerId,
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

  // Combined location setter
  const setLocation = (
    newAdmin1Key: AdminCodeString,
    newAdmin2Key: AdminCodeString,
    properties: GeoJsonProperties,
    level: AdminLevelType,
  ) => {
    setAdmin1Key(newAdmin1Key);
    setAdmin2Key(newAdmin2Key);
    setAdminLevel(level);
    setAdminProperties(properties);
  };

  // Get boundary layer data
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  // Derived values
  const selectedChartLayer = useMemo(
    () =>
      chartLayerId ? (LayerDefinitions[chartLayerId] as WMSLayerProps) : null,
    [chartLayerId],
  );

  // Initialize admin properties if we have boundary data and countryAdmin0Id
  useEffect(() => {
    if (!adminProperties && countryAdmin0Id && boundaryLayerData?.data) {
      setAdminProperties(getProperties(boundaryLayerData.data));
    }
  }, [adminProperties, boundaryLayerData]);

  return {
    // Form state
    chartLayerId,
    setChartLayerId,
    admin1Key,
    admin2Key,
    adminLevel,
    setLocation,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    adminProperties,
    setAdminProperties,

    // Derived values
    selectedChartLayer,
    boundaryLayerData,
    boundaryLayer,
  };
};

export interface UseChartDataOptions {
  chartLayer: WMSLayerProps | null;
  adminProperties: GeoJsonProperties | undefined;
  adminLevel: AdminLevelType;
  startDate: number | null;
  endDate: number | null;
  enabled?: boolean; // Allow disabling the fetch
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

  // Auto-fetch when params change
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
    if (!adminProperties || !requestParams) {
      return appConfig.country;
    }

    const { levels } = chartLayer?.chartData || { levels: [] };
    const levelsDict = Object.fromEntries(levels.map(x => [x.level, x.id]));
    const adminKey = levelsDict[adminLevel.toString()];
    const { name, localName } = requestParams.boundaryProps[adminKey] || {
      name: appConfig.country,
      localName: appConfig.country,
    };

    return name || localName || appConfig.country;
  }, [adminProperties, requestParams, chartLayer, adminLevel]);

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
