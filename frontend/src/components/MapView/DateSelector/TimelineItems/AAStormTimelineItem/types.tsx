export enum WindState {
  monitoring = 'monitoring',
  ready = 'ready',
  activated_64 = 'activated_64',
  activated_118 = 'activated_118',
}
type ShortDate = string;
type CycloneName = string;
export type TimeAndState = { ref_time: string; state: WindState };
export type DateJSON = Record<ShortDate, Record<CycloneName, TimeAndState[]>>;
