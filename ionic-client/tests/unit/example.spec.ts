import { mount } from '@vue/test-utils'
import TitledDivider from '@/components/ui/TitledDivider.vue'
import { describe, expect, test } from 'vitest'

describe('TitledDivider.vue', () => {
  test('renders with correct title', () => {
    const title = 'Test Title'
    const wrapper = mount(TitledDivider, {
      props: { title },
      global: {
        stubs: {
          'ion-item-divider': {
            template: '<div class="ion-item-divider"><slot /></div>',
            props: ['color']
          },
          'ion-title': {
            template: '<div class="ion-title"><slot /></div>',
            props: ['color', 'style']
          }
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain(title)
  })

  test('applies correct props', () => {
    const title = 'Another Test'
    const wrapper = mount(TitledDivider, {
      props: { title },
      global: {
        stubs: {
          'ion-item-divider': {
            template: '<div class="ion-item-divider" :data-color="color"><slot /></div>',
            props: ['color']
          },
          'ion-title': {
            template: '<div class="ion-title" :data-color="color" :data-style="style"><slot /></div>',
            props: ['color', 'style']
          }
        }
      }
    })

    const itemDivider = wrapper.find('.ion-item-divider')
    const ionTitle = wrapper.find('.ion-title')

    expect(itemDivider.attributes('data-color')).toBe('medium')
    expect(ionTitle.attributes('data-color')).toBe('secondary')
  })
})
