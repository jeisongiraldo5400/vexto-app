/**
 * Mocks globales de módulos nativos (Expo / React Native) para Vitest en Node.
 * Ningún test hace red: los adapters o `apiFetch` se mockean en cada archivo.
 */
import { vi } from 'vitest';

vi.mock('react-native', () => import('./react-native'));
vi.mock('expo-router', () => import('./expo-router'));

vi.mock('react-native-safe-area-context', async () => {
  const { createElement } = await import('react');
  const passthrough = ({ children }: { children?: unknown }) => createElement('View', null, children as never);
  return {
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaView: passthrough,
    SafeAreaProvider: passthrough,
  };
});

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => {}),
  impactAsync: vi.fn(async () => {}),
  notificationAsync: vi.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: vi.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    deleteItemAsync: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  };
});

vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0', extra: {}, hostUri: '' } } }));
vi.mock('expo-device', () => ({ isDevice: false }));
vi.mock('expo-splash-screen', () => ({ preventAutoHideAsync: vi.fn(async () => {}), hideAsync: vi.fn(async () => {}) }));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, vi.fn(async () => ({ granted: true }))],
}));
vi.mock('expo-print', () => ({
  printAsync: vi.fn(async () => {}),
  printToFileAsync: vi.fn(async () => ({ uri: 'file:///tmp/cierre.pdf', numberOfPages: 1 })),
}));
vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => {}),
}));
vi.mock('expo-symbols', () => ({ SymbolView: 'SymbolView' }));
vi.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: 'Icon' }));
vi.mock('expo-router/react-navigation', () => ({
  // Se ejecuta como efecto de montaje: suficiente para pantallas enfocadas.
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(cb, [cb]);
  },
  DarkTheme: {},
  DefaultTheme: {},
  ThemeProvider: ({ children }: { children: unknown }) => children,
}));

// `require('*.png')` de los componentes: el número de asset no importa en Node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('node:module') as { _extensions: Record<string, (m: { exports: unknown }) => void> };
Module._extensions['.png'] = (m) => {
  m.exports = 1;
};

(globalThis as { __DEV__?: boolean }).__DEV__ = true;
