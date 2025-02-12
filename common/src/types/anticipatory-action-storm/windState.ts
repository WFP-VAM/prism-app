export enum WindState {
  monitoring = "monitoring",
  ready = "ready",
  activated_48kt = "activated_48kt",
  activated_64kt = "activated_64kt",
}
export type WindStateKey = keyof typeof WindState;

export enum WindStateActivated {
  activated_64kt = "> 118 km/h",
  activated_48kt = "> 89 km/h",
}
export type WindStateActivatedKey = keyof typeof WindStateActivated;
