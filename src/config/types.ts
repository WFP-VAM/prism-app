import 'reflect-metadata';

export type BoundaryKey = 'CODE' | 'CODE1' | 'CODE2';

const optionalMetadataKey = Symbol('optional_property');

// Master Layer type definition. All types/classes looking to exhaust cover of all layers should extend upon this type via LayerType['type']
export type LayerType =
  | BoundaryLayerProps
  | WMSLayerProps
  | NSOLayerProps
  | ImpactLayerProps
  | GroundstationLayerProps;

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
}

export class BoundaryLayerProps extends CommonLayerProps {
  type: 'boundary';
  path: string; // path to admin_boundries.json file - web or local.
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

  adminCode: BoundaryKey;
}

export type AggregationOperations = 'mean' | 'median';
export type ThresholdDefinition = { below?: number; above?: number };
export class ImpactLayerProps extends CommonLayerProps {
  type: 'impact';

  @makeRequired
  title: string;

  @makeRequired
  legend: LegendDefinition;

  @makeRequired
  legendText: string;

  hazardLayer: string;
  baselineLayer: string;
  threshold: ThresholdDefinition;

  // defaults to 'median'
  @optional
  operation?: AggregationOperations;
}

export class GroundstationLayerProps extends CommonLayerProps {
  type: 'groundstation';
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
  id: string;
  title: string;
  table: string;
  legendText: string;

  @optional
  chart?: ChartConfig;
}
