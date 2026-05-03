<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Wall } from '@/types'

const props = defineProps<{
  walls: Wall[]
  wallHeight: number
  wallThickness: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

function initScene(): void {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const width = canvas.clientWidth || 800
  const height = canvas.clientHeight || 600

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  const axesHelper = new THREE.AxesHelper(500)
  scene.add(axesHelper)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000)
  camera.position.set(400, 600, 800)
  camera.lookAt(400, 0, 300)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(width, height)

  controls = new OrbitControls(camera, canvas)
  controls.target.set(400, 0, 300)
  controls.update()

  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()
}

function renderWalls(): void {
  if (!scene) return

  scene.children = scene.children.filter((child) => !(child instanceof THREE.Mesh))

  props.walls.forEach((wall) => {
    const dx = wall.end.x - wall.start.x
    const dz = wall.end.y - wall.start.y
    const length = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)

    const geometry = new THREE.BoxGeometry(length, props.wallHeight, props.wallThickness)
    const material = new THREE.MeshBasicMaterial({ color: 0xcccccc })
    const mesh = new THREE.Mesh(geometry, material)

    const edges = new THREE.EdgesGeometry(geometry)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 })
    const wireframe = new THREE.LineSegments(edges, lineMaterial)
    mesh.add(wireframe)

    mesh.position.set(
      (wall.start.x + wall.end.x) / 2,
      props.wallHeight / 2,
      (wall.start.y + wall.end.y) / 2,
    )

    mesh.rotation.y = -angle
    scene.add(mesh)
  })

  const lastWall = props.walls[props.walls.length - 1]
  if (lastWall) {
    const cx = (lastWall.start.x + lastWall.end.x) / 2
    const cz = (lastWall.start.y + lastWall.end.y) / 2
    controls.target.set(cx, 0, cz)
    camera.position.set(cx + 500, 500, cz + 750)
    controls.update()
  }
}

onMounted(() => {
  initScene()
  renderWalls()
})

watch(() => [props.walls, props.wallHeight, props.wallThickness], renderWalls, { deep: true })
</script>

<template>
  <canvas ref="canvasRef" class="w-full h-full" />
</template>
