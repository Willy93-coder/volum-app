export interface Point {
  x: number
  y: number
}

export interface Wall {
  start: Point
  end: Point
  length?: number
}

export type OpeningKind = 'door' | 'window'

export interface Opening {
  kind: OpeningKind
  start: Point  // canvas coordinates
  end: Point    // canvas coordinates
}

export interface WallDimensions {
  wallHeight: number // cm
  thickness: number  // cm
}

export interface FloorPlan {
  walls: Wall[]
  openings: Opening[]
  dimensions: WallDimensions
}
