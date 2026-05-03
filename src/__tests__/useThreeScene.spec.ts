import { describe, it, expect } from 'vitest'
import { useThreeScene } from '@/composables/useThreeScene'
import type { Wall } from '@/types'

describe('useThreeScene', () => {
  it('should initiliaze scene without values', () => {
    // Arrange
    const { walls } = useThreeScene()

    // Act - nothing to do

    // Assert
    expect(walls.value).toHaveLength(0)
  })

  it('should recive walls values and create 3D walls', () => {
    // Arrange
    const { walls, addWall } = useThreeScene()
    const wall: Wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }

    // Act
    addWall(wall)

    // Assert
    expect(walls.value).toHaveLength(1)
    expect(walls.value[0]).toEqual(wall)
  })

  it('should reset scene when plan is out', () => {
    // Arrange
    const { walls, addWall, resetScene } = useThreeScene()
    const wall: Wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }
    addWall(wall)

    // Act
    resetScene()

    // Assert
    expect(walls.value).toHaveLength(0)
  })
})
