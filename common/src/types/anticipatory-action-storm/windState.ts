export enum WindState {
  monitoring = "monitoring",
  ready = "ready",
  activated_48 = "activated_48kt",
  activated_64 = "activated_64kt"
}

export const displayWindState: Partial<Record<WindState, string>> = {
  [WindState.activated_64]: '> 118 km/h',
  [WindState.activated_48]: '> 89 km/h',
};
