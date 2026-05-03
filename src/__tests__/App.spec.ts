import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import FileUpload from '@/components/FileUpload.vue'
import FloorPlanCanvas from '@/components/FloorPlanCanvas.vue'
import ThreeScene from '@/components/ThreeScene.vue'

vi.mock('three', () => {
  function Scene() {
    return { add: vi.fn<() => void>(), background: null, children: [] }
  }
  function PerspectiveCamera() {
    return { position: { set: vi.fn<() => void>() }, lookAt: vi.fn<() => void>() }
  }
  function WebGLRenderer() {
    return { setSize: vi.fn<() => void>(), render: vi.fn<() => void>() }
  }
  function BoxGeometry() {
    return {}
  }
  function MeshBasicMaterial() {
    return {}
  }
  function Mesh() {
    return { position: { set: vi.fn<() => void>() }, rotation: {}, add: vi.fn<() => void>() }
  }
  function Color() {
    return {}
  }
  function EdgesGeometry() {
    return {}
  }
  function LineBasicMaterial() {
    return {}
  }
  function LineSegments() {
    return {}
  }
  function AxesHelper() {
    return {}
  }

  return {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    BoxGeometry,
    MeshBasicMaterial,
    Mesh,
    Color,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    AxesHelper,
  }
})

vi.mock('three/addons/controls/OrbitControls.js', () => {
  function OrbitControls() {
    return {
      target: { set: vi.fn<() => void>() },
      update: vi.fn<() => void>(),
    }
  }
  return { OrbitControls }
})

describe('App', () => {
  it('should render FileUpload component', () => {
    // Arrange
    const wrapper = mount(App)

    // Act - nothing to do

    // Assert
    expect(wrapper.findComponent(FileUpload).exists()).toBe(true)
  })

  it('should FileUpload upload pdf file', async () => {
    // Arrange
    const wrapper = mount(App)
    const fileUpload = wrapper.findComponent(FileUpload)

    // Act
    await fileUpload.vm.$emit('file-selected', 'blob:http://localhost/fake-url')

    // Assert
    expect(wrapper.findComponent(FloorPlanCanvas).exists()).toBe(true)
  })

  it('should FloorPlanCanvas show pdf and user create walls', async () => {
    // Arrange
    const wrapper = mount(App)
    await wrapper
      .findComponent(FileUpload)
      .vm.$emit('file-selected', 'blob:http://localhost/fake-url')
    const floorPlanCanvas = wrapper.findComponent(FloorPlanCanvas)

    // Act
    await floorPlanCanvas.vm.$emit('wall-added', { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } })

    // Assert
    expect(wrapper.findComponent(ThreeScene).exists()).toBe(true)
  })

  it('should ThreeScene render 3D walls', async () => {
    // Arrange
    const wrapper = mount(App)
    const wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }

    // Act
    await wrapper
      .findComponent(FileUpload)
      .vm.$emit('file-selected', 'blob:http://localhost/fake-url')
    await wrapper.findComponent(FloorPlanCanvas).vm.$emit('wall-added', wall)

    // Assert
    const threeScene = wrapper.findComponent(ThreeScene)
    expect(threeScene.props().walls).toContainEqual(wall)
  })
})
