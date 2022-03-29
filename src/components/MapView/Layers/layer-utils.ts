import { LegendDefinition } from '../../../config/types';

export function legendToStops(legend: LegendDefinition = []) {
  // TODO - Make this function easier to use for point data and explicit its behavior.
  return legend.map(({ value, color }) => [
    typeof value === 'string' ? parseFloat(value.replace('< ', '')) : value,
    color,
  ]);
}
