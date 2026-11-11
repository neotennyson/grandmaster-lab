export interface AccuracyAgg {
  counts: { [k: string]: { w: number; b: number } }
  accW: number
  accB: number
  lossW: number
  lossB: number
}
