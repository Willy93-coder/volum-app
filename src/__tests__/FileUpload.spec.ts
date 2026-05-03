import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FileUpload from '@/components/FileUpload.vue'

describe('FileUpload', () => {
  it('should accept a png file', async () => {
    // Arrange
    const wrapper = mount(FileUpload)
    const file = new File(['content'], 'plano.png', { type: 'image/png' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })

    // Act
    await input.trigger('change')

    // Assert
    expect(wrapper.emitted('file-selected')).toBeTruthy()
  })

  it('should emit event with image url', async () => {
    // Arrange
    const wrapper = mount(FileUpload)
    const file = new File(['content'], 'plano.png', { type: 'image/png' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })

    // Act
    await input.trigger('change')

    // Assert
    const emittedEvents = wrapper.emitted('file-selected')
    expect(emittedEvents).toBeTruthy()
    expect(emittedEvents?.[0]?.[0]).toContain('blob:')
  })

  it('should reject files that are not png or jpg', async () => {
    // Arrange
    const wrapper = mount(FileUpload)
    const file = new File(['content'], 'documento.pdf', { type: 'application/pdf' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })

    // Act
    await input.trigger('change')

    // Assert
    expect(wrapper.emitted('file-selected')).toBeFalsy()
  })
})
