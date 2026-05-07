<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Wall, Opening, Point } from '@/types'
import { CM_TO_PX } from '@/constants'

const props = defineProps<{
  pdfUrl?: string
  walls?: Wall[]
  openings?: Opening[]
}>()

const emit = defineEmits<{
  'wall-added': [wall: Wall]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const points    = ref<Point[]>([])
const bgImage   = ref<HTMLImageElement | null>(null)

function redraw(): void {
  if (!canvasRef.value || !props.pdfUrl) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  if (!bgImage.value || bgImage.value.src !== props.pdfUrl) {
    const img = new Image()
    img.onload = () => { bgImage.value = img; paint(ctx) }
    img.src = props.pdfUrl
  } else {
    paint(ctx)
  }
}

function paint(ctx: CanvasRenderingContext2D): void {
  if (!canvasRef.value || !bgImage.value) return
  const { width, height } = canvasRef.value
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(bgImage.value, 0, 0, width, height)
  drawOverlay(ctx)
}

function drawOverlay(ctx: CanvasRenderingContext2D): void {
  // Draw walls.
  if (props.walls?.length) {
    ctx.save()
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.85)'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (const wall of props.walls) {
      ctx.beginPath()
      ctx.moveTo(wall.start.x, wall.start.y)
      ctx.lineTo(wall.end.x, wall.end.y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(37, 99, 235, 0.9)'
      for (const pt of [wall.start, wall.end]) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // Draw opening symbols.
  if (props.openings?.length) {
    for (const op of props.openings) {
      drawOpeningSymbol(ctx, op)
    }
  }

  // In-progress manual wall points.
  if (points.value.length) {
    ctx.save()
    ctx.fillStyle   = 'rgba(220, 38, 38, 0.9)'
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    for (let i = 0; i < points.value.length; i++) {
      const pt = points.value[i]!
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
      ctx.fill()
      if (i > 0) {
        const prev = points.value[i - 1]!
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

function drawOpeningSymbol(ctx: CanvasRenderingContext2D, op: Opening): void {
  const dx = op.end.x - op.start.x
  const dy = op.end.y - op.start.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return

  const nx = dx / len   // unit vector along gap
  const ny = dy / len
  const px = -ny        // perpendicular
  const py = nx

  ctx.save()
  ctx.lineWidth = 1.5

  if (op.kind === 'door') {
    ctx.strokeStyle = 'rgba(22, 163, 74, 0.9)'

    // Door leaf (closed position along wall).
    ctx.beginPath()
    ctx.moveTo(op.start.x, op.start.y)
    ctx.lineTo(op.end.x, op.end.y)
    ctx.stroke()

    // Quarter-circle arc showing door swing.
    const wallAngle = Math.atan2(ny, nx)
    ctx.beginPath()
    ctx.arc(op.start.x, op.start.y, len, wallAngle, wallAngle - Math.PI / 2, true)
    ctx.stroke()
  } else {
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)'

    const markLen = 5
    ctx.beginPath()
    // Perpendicular marks at each edge.
    ctx.moveTo(op.start.x - markLen * px, op.start.y - markLen * py)
    ctx.lineTo(op.start.x + markLen * px, op.start.y + markLen * py)
    ctx.moveTo(op.end.x   - markLen * px, op.end.y   - markLen * py)
    ctx.lineTo(op.end.x   + markLen * px, op.end.y   + markLen * py)
    // Two glass lines.
    const g = 3
    ctx.moveTo(op.start.x - g * px, op.start.y - g * py)
    ctx.lineTo(op.end.x   - g * px, op.end.y   - g * py)
    ctx.moveTo(op.start.x + g * px, op.start.y + g * py)
    ctx.lineTo(op.end.x   + g * px, op.end.y   + g * py)
    ctx.stroke()
  }
  ctx.restore()
}

function handleClick(event: MouseEvent): void {
  const pt: Point = { x: event.offsetX, y: event.offsetY }
  points.value.push(pt)

  if (points.value.length >= 2) {
    const start = points.value[points.value.length - 2]!
    const end   = points.value[points.value.length - 1]!
    emit('wall-added', { start, end })
  }
  redraw()
}

function handleRightClick(event: MouseEvent): void {
  event.preventDefault()
  points.value = []
  redraw()
}

function resetPoints(): void {
  points.value = []
  redraw()
}

defineExpose({ resetPoints })

onMounted(redraw)
watch(() => props.pdfUrl,    () => { bgImage.value = null; redraw() })
watch(() => props.walls,     redraw, { deep: true })
watch(() => props.openings,  redraw, { deep: true })
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
