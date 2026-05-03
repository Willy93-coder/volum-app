<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Wall, Point } from '@/types'

const props = defineProps<{
  pdfUrl?: string
}>()

const emit = defineEmits<{
  'point-added': [point: Point]
  'wall-added': [wall: Wall]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const points = ref<Point[]>([])

function drawBackground(): void {
  if (!canvasRef.value || !props.pdfUrl) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  const img = new Image()
  img.onload = () => {
    if (!canvasRef.value) return
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    ctx.drawImage(img, 0, 0, canvasRef.value.width, canvasRef.value.height)
  }
  img.src = props.pdfUrl
}

function handleClick(event: MouseEvent): void {
  const point: Point = { x: event.offsetX, y: event.offsetY }

  emit('point-added', point)
  points.value.push(point)

  if (points.value.length >= 2) {
    const start = points.value[points.value.length - 2]
    const end = points.value[points.value.length - 1]

    if (!start || !end) return

    emit('wall-added', { start, end })
  }
}

function handleRightClick(event: MouseEvent): void {
  event.preventDefault()
  points.value = []
}

function resetPoints(): void {
  points.value = []
}

defineExpose({ resetPoints })

onMounted(() => {
  drawBackground()
})

watch(() => props.pdfUrl, drawBackground)
</script>

<template>
  <canvas
    ref="canvasRef"
    width="800"
    height="600"
    class="border border-gray-300 cursor-crosshair"
    @click="handleClick"
    @contextmenu="handleRightClick"
  />
</template>
