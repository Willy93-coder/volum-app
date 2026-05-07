import { ref } from 'vue'
import type { Wall, Opening } from '@/types'

interface DetectionResult {
  walls: Wall[]
  openings: Opening[]
}

type WasmModule = typeof import('@/wasm-pkg/volum_wasm')

let wasmModule: WasmModule | null = null

async function loadWasm(): Promise<WasmModule> {
  if (wasmModule) return wasmModule
  wasmModule = await import('@/wasm-pkg/volum_wasm')
  return wasmModule
}

export function useWallDetection() {
  const isDetecting = ref(false)
  const detectionError = ref<string | null>(null)

  async function detectWalls(
    imageUrl: string,
    canvasWidth = 800,
    canvasHeight = 600,
  ): Promise<DetectionResult> {
    isDetecting.value = true
    detectionError.value = null

    try {
      const mod = await loadWasm()
      const response = await fetch(imageUrl)
      const buffer = await response.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const raw = mod.detect_walls(bytes, canvasWidth, canvasHeight) as DetectionResult
      return raw ?? { walls: [], openings: [] }
    } catch (e) {
      detectionError.value = e instanceof Error ? e.message : 'Error al detectar'
      return { walls: [], openings: [] }
    } finally {
      isDetecting.value = false
    }
  }

  return { isDetecting, detectionError, detectWalls }
}
