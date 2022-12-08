import 'reflect-metadata';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { map, every } from 'lodash';
import { GeoJSON } from 'geojson';
import { rawLayers } from '.';
import type { TableKey } from './utils';

// TODO currently unused. Could be harnessed within admin levels key typing
export type BoundaryKey = 'CODE' | 'CODE1' | 'CODE2';

const optionalMetadataKey = Symbol('optional_property');

// Master Layer type definition. All types/classes looking to exhaust cover of all layer types (nso, wms, etc) should extend upon this type via LayerType['type']
export type LayerType =
  | BoundaryLayerProps
  | WMSLayerProps
  | AdminLevelDataLayerProps
  | ImpactLayerProps
  | PointDataLayerProps;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type LayerKey = keyof UnionToIntersection<typeof rawLayers>;

type MenuGroupItem = {
  id: string;
  label: string;
  main?: boolean;
};

export type MenuGroup = {
  groupTitle: string;
  activateAll: boolean;
  layers: MenuGroupItem[];
};

/**
 * Check if a string/object is an explicitly defined layer in layers.json
 * @param layerKey the string/object to check
 */
export const isLayerKey = (layerKey: string | MenuGroup) => {
  if (typeof layerKey === 'string') {
    return layerKey in rawLayers;
  }
  // check every layer in group
  const layers = map(layerKey.layers, 'id');
  return every(layers, layer => layer in rawLayers);
};

/**
 * Check if a layer is without group, or is the main layer in the group
 * @param layerId
 * @param layers
 */
export const isMainLayer = (layerId: string, layers: LayerType[]) => {
  return !layers
    .filter(sl => sl.group)
    .some(sl => sl.group?.layers?.find(l => l.id === layerId && !l.main));
};

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
  // Optional, to create custom label like '≤50'. if label is not defined
  // then value attribute will be shown instead
  label?: string;
};

export type LegendDefinition = LegendDefinitionItem[];

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
  disableDateParam?: boolean;
};

// Type of vector data that the layer provides
export enum GeometryType {
  Point = 'point',
  LineString = 'linestring',
  Polygon = 'polygon',
}

export enum RasterType {
  Raster = 'raster',
}

export type HazardDataType = GeometryType | RasterType;

// not including standard deviation and sum quite yet
// because we won't be able to re-use the WMS legend
export enum DisplayZonalStats {
  Max = 'Max',
  Mean = 'Mean',
  Median = 'Median',
  Min = 'Min',
}

export type ZonalConfig = {
  // we're keeping snakecase here because that is what zonal uses
  // eslint-disable-next-line camelcase
  class_properties?: string[];
};

/* eslint-disable camelcase */
export type ZonalOptions = {
  zones: GeoJSON;
  zone_properties?: string[];
  classes: GeoJSON;
  class_properties?: string[];
  preserve_features?: boolean;
  class_properties_delimiter?: string;
  dissolve_classes?: boolean;
  remove_features_with_no_overlap?: boolean;
  include_null_class_rows?: boolean;
  on_after_each_zone_feature?: Function;
};
/* eslint-enable camelcase */

// this is the row object found in the table.rows array
// of the result object returned by zonal.calculate
export type ZonalPolygonRow = {
  'stat:area': number;
  'stat:percentage': number;
  // additional dynamic properties
  // like zone:name or class:wind_speed
  [key: string]: number | string | null;
};

export type AdminLevelType = 1 | 2 | 3 | 4 | 5;

export interface ExposedPopulationDefinition {
  id: LayerKey;

  // Geojson property key to extract from WFS Response when running exposed population analysis.
  key: string;

  // GDAL calculation expression in numpy syntax. A is population and B is the selected mask.
  // https://gdal.org/programs/gdal_calc.html
  calc?: string;
}

interface FeatureInfoProps {
  type: LabelType;
  label: string;
}

export type FeatureInfoObject = { [key: string]: FeatureInfoProps };

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

  @optional // Perform population exposure analysis using this layer.
  exposure?: ExposedPopulationDefinition;

  @optional // Display layer extra details from a `markup` file
  contentPath?: string;

  @optional
  featureInfoProps?: { [key: string]: FeatureInfoProps };

  /*
  * only for layer that has grouped menu and always assigned to main layer of group (../components/Navbar/utils.ts)
  * can be set in config/{country}/prism.json by changing the LayerKey (string) into object:
    {
      "group_title": "Rainfall Anomaly" // the title of group
      "activate_all": true // if true then hide layer options and activate all layers at the same time
      "layers" : [ // layer list of layers.json to be grouped
        {
          "id": "rain_anomaly_1month",
          "label": "1-month",
          "main": true
        },
        {
          "id": "rain_anomaly_3month",
          "label": "3-month"
        },
        ...
      ]
    },
  */
  @optional
  group?: MenuGroup;

  @optional
  validity?: Validity; // Include additional dates in the calendar based on the number provided.
}

/*
  To get possible values for fill and lines, go to:
  https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#line
  https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#fill
*/
type LayerStyleProps = {
  fill: FillPaint;
  line: LinePaint;
};

export type DatasetLevel = {
  level: string; // Administrative boundary level.
  id: string; // Geojson property field for admin boundary id.
  name: string; // Geojson property field for admin boundary name.
};

export enum ChartType {
  Bar = 'bar',
  Line = 'line',
}

export type DatasetField = {
  key: string;
  label: string;
  fallback?: number; // If key does not exist in json response use fallback (rainfall anomaly).
  color: string;
};

type DatasetProps = {
  url: string;
  levels: DatasetLevel[];
  type: ChartType;
  fields: DatasetField[]; // Dataset fields from json response.
};

export class BoundaryLayerProps extends CommonLayerProps {
  type: 'boundary';
  path: string; // path to admin_boundries.json file - web or local.
  adminCode: string;
  adminLevelNames: string[]; // Ordered (Admin1, Admin2, ...)
  adminLevelLocalNames: string[]; // Same as above, local to country
  styles: LayerStyleProps; // Mapbox line and fill properties.,

  @optional
  isPrimary?: boolean | undefined;
}

export enum LabelType {
  Date = 'date',
  Text = 'text',
  Number = 'number',
}

interface FeatureInfoProps {
  type: LabelType;
  label: string;
}

export enum DatesPropagation {
  FORWARD = 'forward',
  BACKWARD = 'backward',
  BOTH = 'both',
}

export type Validity = {
  days: number; // Number of days to include in the calendar.
  mode: DatesPropagation; // Propagation mode for dates.
};

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
  formInputs?: LayerFormInput[];

  @optional
  wcsConfig?: RawDataConfiguration;

  @optional // If included, we infer the layer is a vector layer.
  geometry?: GeometryType;

  @optional // If included, zonal statistics configuration, including which property to use for classes
  zonal?: ZonalConfig;

  @optional
  chartData?: DatasetProps; // If included, on a click event, prism will display data from the selected boundary.
}

export class AdminLevelDataLayerProps extends CommonLayerProps {
  type: 'admin_level_data';
  path: string;

  @optional
  dates?: string[];

  @makeRequired
  title: string;

  @optional
  dateUrl?: string;

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

  @optional
  boundary?: LayerKey;
}

export class LayerForm {
  id: LayerKey;
  inputs: LayerFormInput[];
}
export class LayerFormInput {
  id: LayerKey;
  label: string;
  value: string;
  values: [
    {
      label: string;
      value: string;
    },
  ];
}

export class StatsApi {
  url: string;
  zonesUrl: string;
  groupBy: string;
}

export enum AggregationOperations {
  Max = 'max',
  Mean = 'mean',
  Median = 'median',
  Min = 'min',
  Sum = 'sum',
}

export enum PolygonalAggregationOperations {
  Area = 'area',
  Percentage = 'percentage',
}

export type AllAggregationOperations =
  | AggregationOperations
  | PolygonalAggregationOperations;

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

// Fetch and transform data to match PointDataLayer format.
export enum PointDataLoader {
  EWS = 'ews',
}

export class PointDataLayerProps extends CommonLayerProps {
  type: 'point_data';
  data: string;
  dataField: string;
  // URL to fetch all possible dates from
  dateUrl: string;

  @makeRequired
  title: string;

  @makeRequired
  legend: LegendDefinition;

  @makeRequired
  legendText: string;

  @optional
  fallbackData?: string;

  @optional
  additionalQueryParams?: { [key: string]: string | { [key: string]: string } };

  @optional
  featureInfoProps?: FeatureInfoObject;

  @optional
  adminLevelDisplay?: AdminLevelDisplayType;

  @optional
  boundary?: LayerKey;

  @optional
  loader?: PointDataLoader;

  @optional
  authRequired: boolean = false;
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

export type DateItem = {
  displayDate: number; // Date that will be rendered in the calendar.
  queryDate: number; // Date that will be used in the WMS request.
};

export type AvailableDates = {
  [key in
    | WMSLayerProps['serverLayerName']
    | PointDataLayerProps['id']]: DateItem[];
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
  displayLegend?: boolean;
  colors?: string[]; // Array of hex codes.
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

type AdminLevelDisplayType = {
  adminCode: string;
};

export type PointData = {
  lat: number;
  lon: number;
  date: number; // in unix time.
  [key: string]: any;
};

export type PointLayerData = {
  features: PointData[];
};

export type ValidityLayer = {
  name: string;
  dates: number[];
  validity: Validity;
};

export type UserAuth = {
  username: string;
  password: string;
};
