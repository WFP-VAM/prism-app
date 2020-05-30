import 'reflect-metadata';

export type BoundaryKey = 'CODE' | 'CODE1' | 'CODE2';

const optionalMetadataKey = Symbol('optional_property');

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

export type LegendDefinition = {
  value: string | number;
  color: string;
}[];

export type RawDataConfiguration = {
  scale?: number;
  offset?: number;
  noData?: number;
  // Geotiff pixel resolution, in pixels per degree lat/long
  pixelResolution?: number;
};

export class CommonLayerProps {
  id: string;
  title: string;
  type: string;
  opacity: number;
  legendText: string;

  @optional
  dateInterval?: string;

  @optional
  legend?: LegendDefinition;
}

export class WMSLayerProps extends CommonLayerProps {
  type: 'wms';
  baseUrl: string;
  serverLayerName: string;

  @optional
  additionalQueryParams?: { [key: string]: string };

  @optional
  wcsConfig?: RawDataConfiguration;
}

export class NSOLayerProps extends CommonLayerProps {
  type: 'nso';
  path: string;
  adminCode: BoundaryKey;
}

export interface ChartConfig {
  type: string;
  category: string;
  stacked?: boolean;
  exclude?: string[];
  data?: string;
  transpose?: boolean;
  fill?: boolean;
}

export type AggregationOperations = 'mean' | 'median';
export type ThresholdDefinition = { below?: number; above?: number };
export class ImpactLayerProps extends CommonLayerProps {
  type: 'impact';
  hazardLayer: string;
  baselineLayer: string;
  threshold: ThresholdDefinition;

  // defaults to 'median'
  @optional
  operation?: AggregationOperations;

  @makeRequired
  legend: LegendDefinition;
}

export class GroundstationLayerProps extends CommonLayerProps {
  type: 'groundstation';
  data: string;
  @optional
  fallbackData?: string;
  @makeRequired
  legend: LegendDefinition;
}

export type RequiredKeys<T> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

export type LayerType =
  | WMSLayerProps
  | NSOLayerProps
  | ImpactLayerProps
  | GroundstationLayerProps;

// Get the type of a union based on the value (V) and lookup field (K)
export type DiscriminateUnion<
  T,
  K extends keyof T,
  V extends T[K]
> = T extends Record<K, V> ? T : never;

export interface LayersMap {
  [key: string]: LayerType;
}

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

export interface AvailableDates {
  [key: string]: number[];
}

export class TableType {
  id: string;
  title: string;
  table: string;
  legendText: string;

  @optional
  chart?: ChartConfig;
}
