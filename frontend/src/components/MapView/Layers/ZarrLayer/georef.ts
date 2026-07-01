export interface ZarrDatasetCoords {
  times: Float64Array;
  lats: Float64Array;
  lons: Float64Array;
}

function isArrayLikeView(
  value: unknown,
): value is ArrayBufferView & ArrayLike<number> {
  return (
    ArrayBuffer.isView(value) &&
    !(value instanceof DataView) &&
    'length' in value
  );
}

function isZarrChunk(value: unknown): value is {
  data: unknown;
  shape?: unknown;
  stride?: unknown;
} {
  return (
    value !== null &&
    typeof value === 'object' &&
    'data' in value &&
    'shape' in value
  );
}

function isGettableArray(
  value: unknown,
): value is { length: number; get: (index: number) => unknown } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'length' in value &&
    'get' in value &&
    typeof (value as { get: unknown }).get === 'function'
  );
}

/** Coerce zarrita read results and coordinate arrays to Float64Array. */
export function toFloat64Array(data: unknown): Float64Array {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return Float64Array.of(data);
  }

  if (data instanceof Float64Array) {
    return data;
  }

  if (data instanceof Float32Array) {
    return Float64Array.from(data);
  }

  if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
    return Float64Array.from(data, value => Number(value));
  }

  if (isArrayLikeView(data)) {
    return Float64Array.from(data);
  }

  if (Array.isArray(data)) {
    return Float64Array.from(data, value => Number(value));
  }

  if (isGettableArray(data)) {
    const out = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++) {
      out[i] = Number(data.get(i));
    }
    return out;
  }

  if (isZarrChunk(data)) {
    return toFloat64Array(data.data);
  }

  if (data && typeof data === 'object' && 'data' in data) {
    return toFloat64Array((data as { data: unknown }).data);
  }

  throw new Error(
    `Unsupported coordinate array type: ${Object.prototype.toString.call(data)}`,
  );
}

/** Snap a selected timestamp to the nearest index in a time coordinate array. */
export function snapToNearestTimeIndex(
  times: Float64Array,
  selectedMs: number,
): number {
  const targetSec = selectedMs / 1000;
  let bestIdx = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(times[i]! - targetSec);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}
