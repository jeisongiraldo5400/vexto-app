/** Sustituto de `expo-router` con navegación espiable. */
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

export const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), navigate: vi.fn() };
export const useRouter = () => router;
export const useLocalSearchParams = vi.fn(() => ({}) as Record<string, string>);
export const usePathname = vi.fn(() => '/');
export const useFocusEffect = (cb: () => void) => cb();

export function Redirect({ href }: { href: string }) {
  return createElement('Redirect', { href });
}
export function Link({ children, href }: { children?: ReactNode; href: string }) {
  return createElement('Link', { href }, children);
}

function navigator(name: string) {
  const Nav = ({ children, screenOptions }: { children?: ReactNode; screenOptions?: unknown }) =>
    createElement(name, { screenOptions }, children);
  const Screen = (props: { name: string; options?: unknown }) => createElement(`${name}.Screen`, props);
  Screen.displayName = `${name}.Screen`;
  Nav.Screen = Screen;
  return Nav;
}
export const Stack = navigator('Stack');
export const Tabs = navigator('Tabs');
