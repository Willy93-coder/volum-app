import { ref } from 'vue'
import type { FloorPlan, Wall, Opening, WallDimensions } from '@/types'

const DEFAULT_DIMENSIONS: WallDimensions = {
  wallHeight: 250, // cm
  thickness: 15,   // cm
}

const DEFAULT_FLOOR_PLAN: FloorPlan = {
  walls: [],
  openings: [],
  dimensions: DEFAULT_DIMENSIONS,
}

export function useFloorPlan() {
  const floorPlan = ref<FloorPlan>(structuredClone(DEFAULT_FLOOR_PLAN))

  function addWall(wall: Wall): void {
    floorPlan.value.walls.push(wall)
  }

  function addOpening(opening: Opening): void {
    floorPlan.value.openings.push(opening)
  }

  function setDimensions(dimensions: Partial<WallDimensions>): void {
    floorPlan.value.dimensions = { ...floorPlan.value.dimensions, ...dimensions }
  }

  function resetPlan(): void {
    floorPlan.value = structuredClone(DEFAULT_FLOOR_PLAN)
  }

  function undoLastWall(): void {
    floorPlan.value.walls.pop()
  }

  return {
    floorPlan,
    addWall,
    addOpening,
    setDimensions,
    resetPlan,
    undoLastWall,
  }
}
