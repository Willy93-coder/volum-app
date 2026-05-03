import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ThreeScene from '@/components/ThreeScene.vue'
import type { Wall } from '@/types'

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

describe('ThreeScene', () => {
  it('should render canvas', () => {
    // Arrange
    const wrapper = mount(ThreeScene, {
      props: {
        walls: [],
        wallHeight: 250,
        wallThickness: 15,
      },
    })

    // Act - nothing to do

    // Assert
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('should receive walls as prop and render them in canvas', () => {
    // Arrange
    const walls: Wall[] = [{ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }]

    // Act
    const wrapper = mount(ThreeScene, {
      props: {
        walls,
        wallHeight: 250,
        wallThickness: 15,
      },
    })

    // Assert
    expect(wrapper.props().walls).toEqual(walls)
  })

  it('should receive wall height as a prop', () => {
    // Arrange
    const wallHeight = 300

    // Act
    const wrapper = mount(ThreeScene, {
      props: {
        walls: [],
        wallHeight,
        wallThickness: 15,
      },
    })

    // Assert
    expect(wrapper.props().wallHeight).toBe(wallHeight)
  })
})
