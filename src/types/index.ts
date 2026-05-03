export interface Point {
  x: number
  y: number
}

export interface Wall {
  start: Point
  end: Point
  length?: number
}

export interface WallDimensions {
  wallHeight: number // cm - axis Y
  thickness: number // cm - axis X
}

export interface FloorPlan {
  walls: Wall[]
  dimensions: WallDimensions
}
