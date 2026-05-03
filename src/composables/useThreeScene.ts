import { ref } from 'vue'
import type { Wall } from '@/types'

export function useThreeScene() {
  const walls = ref<Wall[]>([])

  function addWall(wall: Wall): void {
    walls.value.push(wall)
  }

  function resetScene(): void {
    walls.value = []
  }

  return {
    walls,
    addWall,
    resetScene,
  }
}
