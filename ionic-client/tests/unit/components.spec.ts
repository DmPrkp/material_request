import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

// Test a simple component that doesn't require complex setup
describe('Component Tests', () => {
  test('basic component mounting works', () => {
    // Create a simple test component
    const TestComponent = {
      template: '<div>Test Component</div>',
      props: {
        message: {
          type: String,
          default: 'Hello World'
        }
      }
    }

    const wrapper = mount(TestComponent, {
      props: {
        message: 'Test Message'
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toBe('Test Component')
  })

  test('component with props works', () => {
    const TestComponent = {
      template: '<div>{{ message }}</div>',
      props: {
        message: {
          type: String,
          required: true
        }
      }
    }

    const wrapper = mount(TestComponent, {
      props: {
        message: 'Hello from test'
      }
    })

    expect(wrapper.text()).toBe('Hello from test')
  })
})
