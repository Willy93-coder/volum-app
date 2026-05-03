<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import FileUpload from '@/components/FileUpload.vue'
import FloorPlanCanvas from '@/components/FloorPlanCanvas.vue'
import ThreeScene from '@/components/ThreeScene.vue'
import { Input } from '@/components/ui/input'
import { useFloorPlan } from '@/composables/useFloorPlan'
import type { Wall } from '@/types'

const { floorPlan, addWall, undoLastWall, setDimensions } = useFloorPlan()

const pdfUrl = ref<string | null>(null)
const floorPlanCanvasRef = ref<{ resetPoints: () => void } | null>(null)

const wallHeight = ref(floorPlan.value.dimensions.wallHeight)
const wallThickness = ref(floorPlan.value.dimensions.thickness)

watch(wallHeight, (val) => setDimensions({ wallHeight: val }))
watch(wallThickness, (val) => setDimensions({ thickness: val }))

function handleFileSelected(url: string): void {
  pdfUrl.value = url
}

function handleWallAdded(wall: Wall): void {
  addWall(wall)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'z') {
    undoLastWall()
    floorPlanCanvasRef.value?.resetPoints()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="flex h-screen">
    <!-- Left: 3D Scene -->
    <div class="w-1/2 bg-gray-100">
      <ThreeScene
        v-if="floorPlan.walls.length > 0"
        :walls="floorPlan.walls"
        :wall-height="floorPlan.dimensions.wallHeight"
        :wall-thickness="floorPlan.dimensions.thickness"
        class="w-full h-full"
      />
    </div>

    <!-- Right: Controls -->
    <div class="w-1/2 flex flex-col gap-4 p-6">
      <FileUpload @file-selected="handleFileSelected" />

      <!-- Dimensions -->
      <div class="flex gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-gray-600">Alto (cm)</label>
          <Input type="number" v-model="wallHeight" class="w-28" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-gray-600">Grosor (cm)</label>
          <Input type="number" v-model="wallThickness" class="w-28" />
        </div>
      </div>

      <!-- Instructions -->
      <div class="text-xs text-gray-500 flex flex-col gap-1">
        <span>🖱️ Click izquierdo — añadir punto</span>
        <span>🖱️ Click derecho — resetear puntos</span>
        <span>⌨️ Ctrl+Z — deshacer última pared</span>
      </div>

      <!-- Canvas or placeholder -->
      <div class="flex-1 flex items-center justify-center" v-if="!pdfUrl">
        <p class="text-gray-400 text-sm">Sube un plano para empezar</p>
      </div>

      <FloorPlanCanvas
        ref="floorPlanCanvasRef"
        v-if="pdfUrl"
        :pdf-url="pdfUrl"
        class="flex-1"
        @wall-added="handleWallAdded"
      />
    </div>
  </div>
</template>
