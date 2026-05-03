import { describe, it, expect } from 'vitest'
import { useFloorPlan } from '@/composables/useFloorPlan'

describe('useFloorPlan', () => {
  it('should initialize with empty walls and default dimensions', () => {
    // Arrange
    const { floorPlan } = useFloorPlan()

    // Act - nothing to do, we're testing initial state

    // Assert
    expect(floorPlan.value.walls).toEqual([])
    expect(floorPlan.value.dimensions.wallHeight).toBe(250)
  })

  it('should add a wall', () => {
    // Arrange
    const { floorPlan, addWall } = useFloorPlan()
    const wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }

    // Act
    addWall(wall)

    // Assert
    expect(floorPlan.value.walls).toHaveLength(1)
    expect(floorPlan.value.walls[0]).toEqual(wall)
  })

  it('should update wall height', () => {
    // Arrange
    const { floorPlan, setDimensions } = useFloorPlan()

    // Act
    setDimensions({ wallHeight: 300 })

    // Assert
    expect(floorPlan.value.dimensions.wallHeight).toBe(300)
  })

  it('should delete a wall', () => {
    // Arrange
    const { floorPlan, addWall, deleteWall } = useFloorPlan()
    const wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }
    addWall(wall)

    // Act
    deleteWall(0)

    // Assert
    expect(floorPlan.value.walls).toHaveLength(0)
  })

  it('should reset the floor plan', () => {
    // Arrange
    const { floorPlan, addWall, resetPlan } = useFloorPlan()
    addWall({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } })

    // Act
    resetPlan()

    // Assert
    expect(floorPlan.value.walls).toHaveLength(0)
    expect(floorPlan.value.dimensions.wallHeight).toBe(250)
  })
})
