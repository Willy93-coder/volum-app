<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Wall, Opening } from '@/types'
import { CANVAS_W, CANVAS_H, PX_TO_CM } from '@/constants'

const props = defineProps<{
  walls: Wall[]
  openings: Opening[]
  wallHeight: number    // cm
  wallThickness: number // cm
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

function cm(px: number): number { return px * PX_TO_CM }

function initScene(): void {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const w = canvas.clientWidth  || 800
  const h = canvas.clientHeight || 600

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f4)

  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  const key = new THREE.DirectionalLight(0xffffff, 0.6)
  key.position.set(0.5, 1, 0.5)
  scene.add(key)

  scene.fog = new THREE.FogExp2(0xf5f5f4, 0.0004)

  const sceneW = cm(CANVAS_W)
  const sceneD = cm(CANVAS_H)
  const cx = sceneW / 2
  const cz = sceneD / 2

  const gridExtent = Math.max(sceneW, sceneD) * 1.6
  const gridDivs   = Math.round(gridExtent / 100)
  const grid       = new THREE.GridHelper(gridExtent, gridDivs, 0x78716c, 0x9e9890)
  grid.position.set(cx, 0, cz)
  scene.add(grid)

  const planDist = Math.max(sceneW, sceneD) * 2.2
  camera = new THREE.PerspectiveCamera(45, w / h, 1, planDist * 20)
  camera.position.set(cx, planDist, cz + planDist * 0.001)
  camera.lookAt(cx, 0, cz)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = false

  controls = new OrbitControls(camera, canvas)
  controls.target.set(cx, 0, cz)
  controls.minDistance = 50
  controls.maxDistance = planDist * 12
  controls.update()

  const animate = () => {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()
}

function clearWallMeshes(): void {
  const toRemove = scene.children.filter((c) => c instanceof THREE.Mesh)
  for (const obj of toRemove) {
    const mesh = obj as THREE.Mesh
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
    mesh.children.forEach((child) => {
      if (child instanceof THREE.LineSegments) child.geometry.dispose()
    })
  }
  scene.children = scene.children.filter((c) => !(c instanceof THREE.Mesh))
}

function addMesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number, y: number, z: number,
  rotY: number,
  withEdges = false,
): void {
  const mesh = new THREE.Mesh(geo, mat)
  if (withEdges) {
    mesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x78716c }),
    ))
  }
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotY
  scene.add(mesh)
}

function renderWalls(): void {
  if (!scene) return
  clearWallMeshes()
  if (props.walls.length === 0) return

  const wallMat = new THREE.MeshLambertMaterial({ color: 0xfafaf9 })
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.35,
  })

  let minX = Infinity, maxX = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  // --- Walls ---
  for (const wall of props.walls) {
    const x1 = cm(wall.start.x), z1 = cm(wall.start.y)
    const x2 = cm(wall.end.x),   z2 = cm(wall.end.y)
    const dx = x2 - x1, dz = z2 - z1
    const length = Math.sqrt(dx * dx + dz * dz)
    if (length < 2) continue

    addMesh(
      new THREE.BoxGeometry(length, props.wallHeight, props.wallThickness),
      wallMat.clone(),
      (x1 + x2) / 2, props.wallHeight / 2, (z1 + z2) / 2,
      -Math.atan2(dz, dx),
      true,
    )

    minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2)
    minZ = Math.min(minZ, z1, z2); maxZ = Math.max(maxZ, z1, z2)
  }

  // --- Openings ---
  const SILL_H    = 90   // cm
  const OPENING_H = 120  // cm
  const lintelBot = SILL_H + OPENING_H

  for (const op of props.openings) {
    const x1 = cm(op.start.x), z1 = cm(op.start.y)
    const x2 = cm(op.end.x),   z2 = cm(op.end.y)
    const dx = x2 - x1, dz = z2 - z1
    const opWidth = Math.sqrt(dx * dx + dz * dz)
    if (opWidth < 1) continue

    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const rotY  = -Math.atan2(dz, dx)
    const th    = props.wallThickness

    if (op.kind === 'window') {
      // Sill
      addMesh(
        new THREE.BoxGeometry(opWidth, SILL_H, th),
        wallMat.clone(),
        midX, SILL_H / 2, midZ, rotY, true,
      )
      // Lintel
      if (lintelBot < props.wallHeight) {
        const lintelH = props.wallHeight - lintelBot
        addMesh(
          new THREE.BoxGeometry(opWidth, lintelH, th),
          wallMat.clone(),
          midX, lintelBot + lintelH / 2, midZ, rotY, true,
        )
      }
      // Glass pane
      addMesh(
        new THREE.BoxGeometry(opWidth, OPENING_H, th * 0.15),
        glassMat.clone(),
        midX, SILL_H + OPENING_H / 2, midZ, rotY,
      )
    } else {
      // Door: thin panel, slightly ajar
      const doorH = props.wallHeight * 0.95
      addMesh(
        new THREE.BoxGeometry(opWidth * 0.95, doorH, th * 0.1),
        new THREE.MeshLambertMaterial({ color: 0xd4a574 }),
        midX, doorH / 2, midZ, rotY + 0.3,
      )
    }
  }

  // Reframe camera to bounding box.
  if (minX === Infinity) return
  const cx   = (minX + maxX) / 2
  const cz   = (minZ + maxZ) / 2
  const span = Math.max(maxX - minX, maxZ - minZ, 200)
  const dist = span * 2.2

  controls.target.set(cx, 0, cz)
  camera.position.set(cx, dist, cz + dist * 0.001)
  camera.lookAt(cx, 0, cz)
  controls.update()
}

onMounted(() => {
  initScene()
  renderWalls()
})

watch(
  () => [props.walls, props.wallHeight, props.wallThickness, props.openings] as const,
  renderWalls,
  { deep: true },
)
</script>

<template>
  <canvas ref="canvasRef" class="w-full h-full" />
</template>
