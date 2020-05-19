export function legendToStops(legend: { value: string; color: string }[] = []) {
  return legend.map(({ value, color }) => [parseFloat(value), color]);
}
