/**
 * Sustituto de `react-native` para pruebas en Node: los componentes son nodos host
 * (strings) que entiende `test-utils/renderer`.
 */
import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react';
import { vi } from 'vitest';

export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const Pressable = 'Pressable';
export const TouchableOpacity = 'Pressable';
export const ScrollView = 'ScrollView';
export const Image = 'Image';
export const ActivityIndicator = 'ActivityIndicator';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const SafeAreaView = 'View';
export const Switch = 'Switch';
export const RefreshControl = 'RefreshControl';

export function Modal({ visible, children, ...rest }: { visible?: boolean; children?: ReactNode }) {
  return visible ? createElement('Modal', rest, children) : null;
}

const asElement = (C: unknown) =>
  C == null ? null : isValidElement(C) ? C : createElement(C as ComponentType);

export function FlatList({
  data,
  renderItem,
  keyExtractor,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  ...rest
}: any) {
  const items = (data ?? []) as unknown[];
  return createElement(
    'FlatList',
    rest,
    asElement(ListHeaderComponent),
    items.length === 0
      ? asElement(ListEmptyComponent)
      : items.map((item, index) =>
          createElement(
            'Item',
            { key: keyExtractor ? keyExtractor(item, index) : String(index) },
            renderItem({ item, index, separators: {} }),
          ),
        ),
    asElement(ListFooterComponent),
  );
}

const flatten = (s: any): any =>
  Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity).filter(Boolean).map(flatten)) : (s ?? {});

export const StyleSheet = {
  create: <T>(s: T) => s,
  flatten,
  hairlineWidth: 1,
  absoluteFill: {},
  absoluteFillObject: {},
};

export const Platform = {
  OS: 'ios' as string,
  Version: 17,
  select: (o: Record<string, unknown>) => o.ios ?? o.native ?? o.default,
};

export const Alert = { alert: vi.fn() };
export const Keyboard = {
  addListener: vi.fn(() => ({ remove: () => {} })),
  dismiss: vi.fn(),
  scheduleLayoutAnimation: vi.fn(),
};
export const AppState = {
  currentState: 'active',
  addEventListener: vi.fn(() => ({ remove: () => {} })),
};
export const AccessibilityInfo = { announceForAccessibility: vi.fn() };
export const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};
export const Linking = { openURL: vi.fn(), canOpenURL: vi.fn(async () => true) };
export const Share = { share: vi.fn() };
export const useColorScheme = () => 'light';
export const useWindowDimensions = () => Dimensions.get();
export const LayoutAnimation = { configureNext: vi.fn(), Presets: {} };
export const I18nManager = { isRTL: false };
export const PixelRatio = { get: () => 3 };
