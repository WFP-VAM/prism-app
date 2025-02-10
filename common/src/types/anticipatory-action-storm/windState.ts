export enum WindState {
  monitoring = "monitoring",
  ready = "ready",
  activated_48 = "activated_89",
  activated_64 = "activated_118",
}
export type WindStateKey = keyof typeof WindState;

export enum WindStateActivated {
  activated_118 = "> 118 km/h",
  activated_89 = "> 89 km/h",
}
export type WindStateActivatedKey = keyof typeof WindStateActivated;
