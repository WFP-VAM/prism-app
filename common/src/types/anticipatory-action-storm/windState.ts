export enum WindState {
  monitoring = "monitoring",
  ready = "ready",
  activated_48kt = "activated_48kt",
  activated_64kt = "activated_64kt",
}

export const displayWindState: Partial<Record<WindState, string>> = {
  [WindState.activated_64kt]: "> 118 km/h",
  [WindState.activated_48kt]: "> 89 km/h",
};
