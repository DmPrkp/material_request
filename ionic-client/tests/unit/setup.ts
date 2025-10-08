import { vi } from 'vitest'

// Mock Ionic components
vi.mock('@ionic/vue', () => ({
  IonPage: { name: 'IonPage', template: '<div><slot /></div>' },
  IonContent: { name: 'IonContent', template: '<div><slot /></div>' },
  IonItemDivider: { name: 'IonItemDivider', template: '<div><slot /></div>' },
  IonTitle: { name: 'IonTitle', template: '<div><slot /></div>' },
}))

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    name: 'main',
    params: {},
    query: {},
    path: '/',
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
}))

// Mock Pinia stores
vi.mock('@/store', () => ({
  useMainMenuStore: vi.fn(() => ({
    $state: [],
  })),
  usePreloader: vi.fn(() => ({
    setPreloader: vi.fn(),
  })),
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key),
  })),
}))

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
