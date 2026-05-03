import { ref } from 'vue'
import type { FloorPlan, Wall, WallDimensions } from '@/types'

const DEFAULT_DIMENSIONS: WallDimensions = {
  wallHeight: 250, // cm
  thickness: 15, // cm
}

const DEFAULT_FLOOR_PLAN: FloorPlan = {
  walls: [],
  dimensions: DEFAULT_DIMENSIONS,
}

export function useFloorPlan() {
  const floorPlan = ref<FloorPlan>(structuredClone(DEFAULT_FLOOR_PLAN))

  function addWall(wall: Wall): void {
    floorPlan.value.walls.push(wall)
  }

  function setDimensions(dimensions: Partial<WallDimensions>): void {
    floorPlan.value.dimensions = { ...floorPlan.value.dimensions, ...dimensions }
  }

  function updateWallLength(index: number, length: number): void {
    const wall = floorPlan.value.walls[index]
    if (!wall) return
    floorPlan.value.walls[index] = { ...wall, length }
  }

  function deleteWall(index: number): void {
    floorPlan.value.walls.splice(index, 1)
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
    setDimensions,
    updateWallLength,
    deleteWall,
    resetPlan,
    undoLastWall,
  }
}
