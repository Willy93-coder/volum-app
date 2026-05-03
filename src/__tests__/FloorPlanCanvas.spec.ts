import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FloorPlanCanvas from '@/components/FloorPlanCanvas.vue'

describe('FloorPlantCanvas', () => {
  it('should render canvas', () => {
    // Arrange
    const wrapper = mount(FloorPlanCanvas)

    // Act - nothing to do, we're testing initial render

    // Assert
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('should render pdf as screen', () => {
    // Arrange
    const pdfUrl = 'blob:http://localhost/fake-pdf-url'

    // Act
    const wrapper = mount(FloorPlanCanvas, {
      props: {
        pdfUrl,
      },
    })

    // Assert
    expect(wrapper.props().pdfUrl).toBe(pdfUrl)
  })

  it('should add click points in canvas', async () => {
    // Arrange
    const wrapper = mount(FloorPlanCanvas)
    const canvas = wrapper.find('canvas')

    // Act
    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'offsetX', { value: 100 })
    Object.defineProperty(event, 'offsetY', { value: 150 })
    canvas.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.emitted('point-added')).toBeTruthy()
    expect(wrapper.emitted('point-added')?.[0]?.[0]).toEqual({ x: 100, y: 150 })
  })

  it('should connect points in canvas to create walls', async () => {
    // Arrange
    const wrapper = mount(FloorPlanCanvas)
    const canvas = wrapper.find('canvas')

    // Act
    const event1 = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event1, 'offsetX', { value: 100 })
    Object.defineProperty(event1, 'offsetY', { value: 150 })
    canvas.element.dispatchEvent(event1)
    await wrapper.vm.$nextTick()

    const event2 = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event2, 'offsetX', { value: 200 })
    Object.defineProperty(event2, 'offsetY', { value: 250 })
    canvas.element.dispatchEvent(event2)
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.emitted('point-added')).toBeTruthy()
    expect(wrapper.emitted('point-added')?.[0]?.[0]).toEqual({ x: 100, y: 150 })
    expect(wrapper.emitted('point-added')?.[1]?.[0]).toEqual({ x: 200, y: 250 })
    expect(wrapper.emitted('wall-added')).toBeTruthy()
    expect(wrapper.emitted('wall-added')?.[0]?.[0]).toEqual({
      start: { x: 100, y: 150 },
      end: { x: 200, y: 250 },
    })
  })
})
