/**
 * URL Parameter Schema - Declarative URL param parsing utilities.
 *
 * Provides type-safe, schema-based parsing of URL search parameters.
 * Use `param.*` factories for common types, `param.custom()` for complex parsing.
 */

type ParamParser<T> = (value: string | null, params: URLSearchParams) => T;

export const param = {
  string:
    (defaultVal: string = ''): ParamParser<string> =>
    v =>
      v ?? defaultVal,
  stringOrNull: (): ParamParser<string | null> => v => v,

  number:
    (defaultVal: number): ParamParser<number> =>
    v => {
      if (v === null) {
        return defaultVal;
      }
      const num = parseFloat(v);
      return Number.isNaN(num) ? defaultVal : num;
    },

  boolean:
    (defaultVal: boolean = false): ParamParser<boolean> =>
    v => {
      if (v === null) {
        return defaultVal;
      }
      return v === 'true' || v === '1';
    },

  stringArray:
    <T extends string = string>(defaultVal: T[] = []): ParamParser<T[]> =>
    v =>
      (v?.split(',').filter(Boolean) as T[]) ?? defaultVal,

  json:
    <T extends object>(defaultVal: T): ParamParser<T> =>
    v => {
      if (!v) {
        return defaultVal;
      }
      try {
        return { ...defaultVal, ...JSON.parse(v) };
      } catch {
        return defaultVal;
      }
    },

  custom: <T>(parser: ParamParser<T>): ParamParser<T> => parser,
};

type SchemaEntry<T> = {
  key: string;
  parse: ParamParser<T>;
};

type Schema = Record<string, SchemaEntry<unknown>>;

type ParsedSchema<S extends Schema> = {
  [K in keyof S]: S[K] extends SchemaEntry<infer T> ? T : never;
};

/**
 * Define a schema entry with URL param key and parser.
 * @param key - The URL search param key (e.g., 'hazardLayerIds')
 * @param parse - Parser function from `param.*` factories
 */
export function defineParam<T>(
  key: string,
  parse: ParamParser<T>,
): SchemaEntry<T> {
  return { key, parse };
}

/**
 * Parse URL search params using a schema.
 * Returns an object with parsed values, with types inferred from the schema.
 */
export function parseUrlParams<S extends Schema>(
  search: string,
  schema: S,
): ParsedSchema<S> {
  const params = new URLSearchParams(search);
  const result = {} as ParsedSchema<S>;

  for (const [name, { key, parse }] of Object.entries(schema)) {
    (result as Record<string, unknown>)[name] = parse(params.get(key), params);
  }

  return result;
}

export function getBoolParam(
  params: URLSearchParams,
  key: string,
  defaultVal: boolean = false,
): boolean {
  const val = params.get(key);
  if (val === null) {
    return defaultVal;
  }
  return val === 'true' || val === '1';
}

export function getNumParam(
  params: URLSearchParams,
  key: string,
  defaultVal: number,
): number {
  const val = params.get(key);
  if (val === null) {
    return defaultVal;
  }
  const num = parseFloat(val);
  return Number.isNaN(num) ? defaultVal : num;
}
