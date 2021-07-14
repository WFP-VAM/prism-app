import 'reflect-metadata';
import { rawLayers } from '.';
import type { TableKey } from './utils';

// TODO currently unused. Could be harnessed within admin levels key typing
export type BoundaryKey = 'CODE' | 'CODE1' | 'CODE2';

const optionalMetadataKey = Symbol('optional_property');

// Master Layer type definition. All types/classes looking to exhaust cover of all layer types (nso, wms, etc) should extend upon this type via LayerType['type']
export type LayerType =
  | BoundaryLayerProps
  | WMSLayerProps
  | NSOLayerProps
  | ImpactLayerProps
  | PointDataLayerProps;

export type LayerKey = keyof typeof rawLayers;
/**
 * Check if a string is an explicitly defined layer in layers.json
 * @param layerKey the string to check
 */
export const isLayerKey = (layerKey: string): layerKey is LayerKey =>
  layerKey in rawLayers;

/**
 * Decorator to mark a property on a class type as optional. This allows us to get a list of all required keys at
 * runtime for type checking.
 *
 * Note this has nothing to do with how TypeScript compile-time checking, this is *only* for runtime checks.
 * @param target
 * @param propertyKey
 */
export function optional(target: any, propertyKey: string) {
  const existingKeys: string[] =
    Reflect.getMetadata(optionalMetadataKey, target) || [];
  return Reflect.defineMetadata(
    optionalMetadataKey,
    existingKeys.concat(propertyKey),
    target,
  );
}

export function makeRequired(target: any, propertyKey: string) {
  const existingKeys: string[] =
    Reflect.getMetadata(optionalMetadataKey, target) || [];
  return Reflect.defineMetadata(
    optionalMetadataKey,
    existingKeys.filter(v => v !== propertyKey),
    target,
  );
}

// Generic that verifies that type `T` is a class (basically that it has a constructor)
export type ClassType<T> = { new (...args: any): T };
// create a generic type https://jpwilliams.dev/how-to-unpack-the-return-type-of-a-promise-in-typescript
export type AsyncReturnType<T extends (...args: any) => any> =
  // if T matches this signature and returns a Promise, extract
  // U (the type of the resolved promise) and use that, or...
  T extends (...args: any) => Promise<infer U>
    ? U // if T matches this signature and returns anything else, // extract the return value U and use that, or...
    : T extends (...args: any) => infer U
    ? U // if everything goes to hell, return an `any`
    : any;

/*
 * Get an array of required keys for a class.
 *
 * This has 2 requirements:
 * 1. The class must be instantiable with a no-argument constructor
 * 2. Optional keys should be decorated with `@optional` (or else they will be considered required)
 * @param constructor
 */
export function requiredKeysForClassType(constructor: ClassType<any>) {
  const target = new constructor();
  const allKeys = Object.getOwnPropertyNames(target);
  const optionalKeys = Reflect.getMetadata(optionalMetadataKey, target) || [];
  return allKeys.filter(k => !optionalKeys.includes(k));
}

/**
 * Guard function to check whether a given object is an instance of `classType`.
 * @param classType
 * @param maybeType Object to check.
 * @param logErrors Flag to print out a verbose error message to the console if the object fails
 * @param id
 */
export function checkRequiredKeys<T>(
  classType: ClassType<T>,
  maybeType: Record<string, any>,
  logErrors = false,
  id?: string,
): maybeType is T {
  const requiredKeys = requiredKeysForClassType(classType);
  const missingKey = requiredKeys.find(
    k => !Object.prototype.hasOwnProperty.call(maybeType, k),
  );

  if (logErrors) {
    if (missingKey) {
      console.error(
        `Object %o is invalid: Missing required property '${missingKey}'.`,
        maybeType,
      );
    }

    // Log warnings for keys that aren't a part of this definition
    // eslint-disable-next-line new-cap
    const target = new classType();
    const allKeys = Object.getOwnPropertyNames(target);
    Object.keys(maybeType)
      .filter(key => !allKeys.includes(key))
      .forEach(key =>
        console.warn(`Found unknown key '${key}' on config for ${id}`),
      );
  }
  return !missingKey;
}

export type LegendDefinitionItem = {
  value: string | number;
  color: string;
};

export type LegendDefinition = LegendDefinitionItem[];

export type GroupDefinition = {
  name: string;
  // Main layer of a group of layers. Secondary layers will not trigger notifications.
  main: boolean;
};

export enum WcsGetCoverageVersion {
  oneZeroZero = '1.0.0',
  twoZeroZero = '2.0.0',
}

export type RawDataConfiguration = {
  scale?: number;
  offset?: number;
  noData?: number;

  // WCS GetCoverage request version.
  version?: WcsGetCoverageVersion;

  // Geotiff pixel resolution, in pixels per degree lat/long
  pixelResolution?: number;

  // Remote layers might not have time dimension enabled.
  timeSupport?: boolean;
};

// Type of vector data that the layer provides
export enum GeometryType {
  Point = 'point',
  LineString = 'linestring',
  Polygon = 'polygon',
}

export interface ExposedPopulationDefinition {
  id: LayerKey;

  // Geojson property key to extract from WFS Response when running exposed population analysis.
  key: string;
}

export class CommonLayerProps {
  id: LayerKey;

  @optional // only optional for boundary layer
  title?: string;

  type: string;
  opacity: number;

  @optional
  dateInterval?: string;

  @optional // only optional for boundary layer
  legend?: LegendDefinition;

  @optional // only optional for boundary layer
  legendText?: string;

  @optional // only optional for boundary layer
  group?: GroupDefinition;

  @optional // Perform population exposure analysis using this layer.
  exposure?: ExposedPopulationDefinition;
}

export class BoundaryLayerProps extends CommonLayerProps {
  type: 'boundary';
  path: string; // path to admin_boundries.json file - web or local.
  adminCode: string;
  adminLevelNames: string[]; // Ordered (Admin1, Admin2, ...)
  adminLevelLocalNames: string[]; // Same as above, local to country
}

export enum LabelType {
  Date = 'date',
  Text = 'text',
  Number = 'number',
}

interface featureInfoProps {
  type: LabelType;
  label: string;
}

export class WMSLayerProps extends CommonLayerProps {
  type: 'wms';
  baseUrl: string;
  serverLayerName: string;

  @makeRequired
  title: string;

  @makeRequired
  legend: LegendDefinition;

  @makeRequired
  legendText: string;

  @optional
  additionalQueryParams?: { [key: string]: string };

  @optional
  wcsConfig?: RawDataConfiguration;

  @optional
  featureInfoProps?: { [key: string]: featureInfoProps };

  @optional // If included, we infer the layer is a vector layer.
  geometry?: GeometryType;
}

export class NSOLayerProps extends CommonLayerProps {
  type: 'nso';
  path: string;

  @makeRequired
  title: string;

  @makeRequired
  legend: LegendDefinition;

  @makeRequired
  legendText: string;

  @makeRequired
  adminCode: string;

  @makeRequired
  adminLevel: number;

  @makeRequired
  dataField: string;
}

export class StatsApi {
  url: string;
  zonesUrl: string;
  groupBy: string;
}

export enum AggregationOperations {
  Mean = 'mean',
  Median = 'median',
  Sum = 'sum',
}

export type ThresholdDefinition = { below?: number; above?: number };

export class ImpactLayerProps extends CommonLayerProps {
  type: 'impact';

  @makeRequired
  title: string;

  @makeRequired
  legend: LegendDefinition;

  @makeRequired
  legendText: string;

  hazardLayer: LayerKey; // not all layers supported here, just WMS layers
  baselineLayer: LayerKey; // not all layers supported here, just NSO layers. Maybe an advanced way to type this?
  threshold: ThresholdDefinition;

  // defaults to 'median'
  @optional
  operation?: AggregationOperations;

  @optional
  api?: StatsApi;
}

export class PointDataLayerProps extends CommonLayerProps {
  type: 'point_data';
  data: string;

  @makeRequired
  title: string;

  @makeRequired
  legend: LegendDefinition;

  @makeRequired
  legendText: string;

  measure: string;
  @optional
  fallbackData?: string;
  // URL to fetch all possible dates from
  dateUrl: string;
}

export type RequiredKeys<T> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

// Get the type of a union based on the value (V) and lookup field (K)
export type DiscriminateUnion<
  T,
  K extends keyof T,
  V extends T[K]
> = T extends Record<K, V> ? T : never;

export type LayersMap = {
  [key in LayerKey]: LayerType;
};

export interface LayersCategoryType {
  title: string;
  layers: LayerType[];
  tables: TableType[];
}

export interface MenuItemType {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
}

export interface MenuItemMobileType {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
  expanded: string;
  selectAccordion: (arg: string) => void;
}

export type AvailableDates = {
  [key in
    | WMSLayerProps['serverLayerName']
    | PointDataLayerProps['id']]: number[];
};

/* eslint-disable camelcase */
export interface WfsRequestParams {
  url: string;
  layer_name: string;
  time?: string;
  key: string;
}
/* eslint-enable camelcase */

export interface ChartConfig {
  type: string;
  category: string;
  stacked?: boolean;
  exclude?: string[];
  data?: string;
  transpose?: boolean;
  fill?: boolean;
}

export class TableType {
  id: TableKey;
  title: string;
  table: string;
  legendText: string;

  @optional
  chart?: ChartConfig;
}

// used for timeline items in date selector
export type DateRangeType = {
  value: number;
  label: string;
  month: string;
  isFirstDay: boolean;
};

export interface FeatureInfoType {
  bbox: number[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RequestFeatureInfo extends FeatureInfoType {
  service: string;
  request: string;
  version: string;
  exceptions: string;
  infoFormat: string;
  layers: string;
  srs: string;
  queryLayers: string;
  featureCount: number;
  format: string;
  styles: string;
}

export enum DownloadFormat {
  CSV,
  JSON,
}
