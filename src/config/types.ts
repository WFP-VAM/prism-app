import { Map, List } from 'immutable';
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
  const optionalKeys = Reflect.getMetadata(optionalMetadataKey, target);
  return allKeys.filter(k => !optionalKeys.includes(k));
}

/**
 * Guard function to check whether a given object is an instance of `classType`.
 * @param classType
 * @param maybeType Object to check.
 * @param logErrors Flag to print out a verbose error message to the console if the object fails
 */
export function checkRequiredKeys<T>(
  classType: ClassType<T>,
  maybeType: Record<string, any>,
  logErrors = false,
): maybeType is T {
  const requiredKeys = requiredKeysForClassType(classType);
  const missingKey = requiredKeys.find(
    k => !Object.prototype.hasOwnProperty.call(maybeType, k),
  );

  if (logErrors && missingKey) {
    console.error(
      `Object %o is invalid: Missing required property '${missingKey}'.`,
      maybeType,
    );
  }
  return !missingKey;
}

class CommonLayerProps {
  id: string;
  title: string;
  type: string;
  opacity: number;
  legendText: string;

  @optional
  dateInterval?: string;

  @optional
  legend?: {
    value: string;
    color: string;
  }[];
}

export class WMSLayerProps extends CommonLayerProps {
  type: 'wms';
  serverLayerName: string;
  serverUri: string;
}

export class NSOLayerProps extends CommonLayerProps {
  type: 'nso';
  data: string;
  adminCode: BoundaryKey;
}

export type RequiredKeys<T> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

export type LayerType = WMSLayerProps | NSOLayerProps;

export type TypedStringMap<T> = Map<string, T>;

export type LayersMap = Map<string, LayerType>;

export interface LayersCategoryType {
  title: string;
  layers: LayerType[];
}

export interface MenuItemType {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
}

export interface AvailableDates extends Map<string, List<number>> {}
