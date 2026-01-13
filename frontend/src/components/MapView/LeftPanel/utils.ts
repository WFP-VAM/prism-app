import { camelCase, get, map, mapKeys, startCase } from 'lodash';
import { GeoJsonProperties } from 'geojson';
import { appConfig } from 'config';
import {
  isTableKey,
  LayerDefinitions,
  TableDefinitions,
  TableKey,
  getWMSLayersWithChart,
} from 'config/utils';
import {
  isLayerKey,
  LayerKey,
  LayersCategoryType,
  LayerType,
  MenuGroup,
  MenuItemType,
} from 'config/types';

const { multiCountry, country } = appConfig;
const chartLayers = getWMSLayersWithChart();
const adminLookup =
  chartLayers.length > 0
    ? chartLayers[0]?.chartData?.levels[0]?.name
    : undefined;

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(
  layersList: {
    [key: string]: Array<LayerKey | TableKey>;
  },
  selectedLayers?: LayerType[],
): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => ({
    title: startCase(layersListKey),
    layers: layerKeys.filter(isLayerKey).map(key => {
      if (typeof key === 'object') {
        const group = mapKeys(key, (_v, k: string) =>
          camelCase(k),
        ) as unknown as MenuGroup;
        const mainLayer =
          group.layers.find(gl =>
            selectedLayers?.some(sl => sl.id === gl.id),
          ) || group.layers.find(l => l.main);

        const layer = LayerDefinitions[mainLayer?.id as LayerKey];

        // Check if layer is frozen or sealed before writing to it, required to prevent a race condition
        if (Object.isFrozen(layer)) {
          console.error(`Layer ${layer?.id} is frozen and cannot be modified.`);
        } else if (Object.isSealed(layer)) {
          console.error(`Layer ${layer?.id} is sealed and cannot be modified.`);
        } else {
          layer.group = group;
        }

        return { ...layer, group };
      }
      return LayerDefinitions[key as LayerKey];
    }),
    tables: layerKeys.filter(isTableKey).map(key => TableDefinitions[key]),
  }));
}

/**
 * Returns true if every layer/table key in every layer category given actually exists.
 * Returns false otherwise.
 * @param layersCategories a dictionary of layer categories from appJSON.categories
 */
function checkLayersCategories(
  layersCategories: Record<string, any>,
): layersCategories is Record<string, Array<LayerKey | TableKey>> {
  return Object.values(layersCategories)
    .flat()
    .every(layerOrTableKey => {
      if (isLayerKey(layerOrTableKey) || isTableKey(layerOrTableKey)) {
        return true;
      }
      console.error(`Key ${layerOrTableKey} isn't a valid layer or table key`);
      return false;
    });
}

export const menuList: MenuItemsType = map(
  appConfig.categories,
  (layersCategories, categoryKey) => {
    if (!checkLayersCategories(layersCategories)) {
      throw new Error(
        `'${categoryKey}' in prism.json isn't a valid category. Check console for more details.`,
      );
    }
    return {
      title: startCase(categoryKey),
      icon: get(appConfig, `icons.${categoryKey}`, 'icon_vulnerable.png'),
      layersCategories: formatLayersCategories(layersCategories),
    };
  },
);

export const getDynamicMenuList = (selectedLayers?: LayerType[]) =>
  map(appConfig.categories, (layersCategories, categoryKey) => {
    if (!checkLayersCategories(layersCategories)) {
      throw new Error(
        `'${categoryKey}' in prism.json isn't a valid category. Check console for more details.`,
      );
    }
    return {
      title: startCase(categoryKey),
      icon: get(appConfig, `icons.${categoryKey}`, 'icon_vulnerable.png'),
      layersCategories: formatLayersCategories(
        layersCategories,
        selectedLayers,
      ),
    };
  });

export const tablesMenuItems = menuList.filter((menuItem: MenuItemType) =>
  menuItem.layersCategories.some(
    (layerCategory: LayersCategoryType) => layerCategory.tables.length > 0,
  ),
);

export const areTablesAvailable = tablesMenuItems.length >= 1;
export const isAnticipatoryActionDroughtAvailable =
  !!appConfig.anticipatoryActionDroughtUrl;
export const isAnticipatoryActionStormAvailable =
  !!appConfig.anticipatoryActionStormUrl;
export const isAnticipatoryActionFloodAvailable =
  !!appConfig.anticipatoryActionFloodUrl;

export const oneDayInMs = 24 * 60 * 60 * 1000;
export const oneYearInMs = 365 * oneDayInMs;

/**
 * Extracts the country name from GeoJSON properties based on configuration settings.
 *
 * @param admProps - GeoJSON properties containing administrative data
 * @returns The country name as a string
 *
 * Behavior:
 * - For single country mode: Returns the configured country name
 * - For multi-country mode:
 *   1. Returns empty string if no properties provided
 *   2. Uses adminLookup property if configured
 *   3. Falls back to admin0Name property
 *   4. Returns empty string if no valid name found
 */
export const getCountryName = (admProps: GeoJsonProperties): string => {
  if (!multiCountry) {
    return country;
  }

  if (!admProps) {
    return '';
  }

  if (adminLookup) {
    return admProps[adminLookup] as string;
  }

  return (admProps.admin0Name as string) || '';
};

/**
 * Formats a location string from administrative area names.
 *
 * @param countryName - Name of the country
 * @param adm1Name - Name of admin level 1 area
 * @param adm2Name - Name of admin level 2 area
 * @param admLevel - Current administrative level
 * @returns Formatted location string
 */
export const formatLocationString = (
  countryName: string,
  adm1Name: string,
  adm2Name: string,
  admLevel: number,
): string =>
  `${countryName}${admLevel > 0 ? ` - ${adm1Name}` : ''}${
    admLevel > 1 ? ` - ${adm2Name}` : ''
  }`;

/**
 * Formats a time period string from start and end dates.
 *
 * @param startDate - Start date in milliseconds
 * @param endDate - End date in milliseconds
 * @param t - Translation function
 * @returns Formatted date range string
 */
export const formatTimePeriodString = (
  startDate: number | null,
  endDate: number | null,
  t: (key: string) => string,
): string => {
  if (startDate === null || endDate === null) {
    return '';
  }

  const options = {
    weekday: undefined,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const formatDate = (d: number) => {
    const dd = new Date(d);
    return dd.toLocaleDateString(t('date_locale'), options as any);
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};
