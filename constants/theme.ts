/**
 * Colores alineados con vexto-frontend:
 * - `src/lib/mui/ThemeProvider.tsx` (palette)
 * - `src/app/globals.css` (:root)
 */
import { Platform, type ViewStyle } from 'react-native';

/** Marca Vexto — verde principal + acento lima (secundario MUI) */
export const Brand = {
  primary: '#1a5f3f',
  primaryLight: '#2d7a56',
  primaryDark: '#14522d',
  secondary: '#84cc16',
  secondaryLight: '#a3d946',
  secondaryDark: '#65a30d',
} as const;

export type ThemeColors = {
  text: string;
  textSecondary: string;
  textMuted: string;
  background: string;
  backgroundPaper: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  icon: string;
  border: string;
  borderSubtle: string;
  inputBackground: string;
  inputBorder: string;
  card: string;
  cardBorder: string;
  error: string;
  warning: string;
  onPrimary: string;
  /** Chips / selección suave sobre el tint */
  tintMuted: string;
};

export const Colors: Record<'light' | 'dark', ThemeColors> = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    background: '#f1f5f9',
    backgroundPaper: '#ffffff',
    tint: Brand.primary,
    tabIconDefault: '#64748b',
    tabIconSelected: Brand.primary,
    icon: '#64748b',
    border: 'rgba(15, 23, 42, 0.12)',
    borderSubtle: 'rgba(15, 23, 42, 0.06)',
    inputBackground: '#ffffff',
    inputBorder: 'rgba(15, 23, 42, 0.12)',
    card: '#ffffff',
    cardBorder: 'rgba(15, 23, 42, 0.08)',
    error: '#dc2626',
    warning: '#d97706',
    onPrimary: '#ffffff',
    tintMuted: 'rgba(26, 95, 63, 0.12)',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    background: '#0f172a',
    backgroundPaper: '#1e293b',
    tint: Brand.secondary,
    tabIconDefault: '#94a3b8',
    tabIconSelected: Brand.secondary,
    icon: '#94a3b8',
    border: 'rgba(248, 250, 252, 0.12)',
    borderSubtle: 'rgba(248, 250, 252, 0.06)',
    inputBackground: '#0f172a',
    inputBorder: 'rgba(248, 250, 252, 0.14)',
    card: '#1e293b',
    cardBorder: 'rgba(248, 250, 252, 0.1)',
    error: '#f87171',
    warning: '#fbbf24',
    onPrimary: '#0f172a',
    tintMuted: 'rgba(132, 204, 22, 0.18)',
  },
};

/** Degradado del panel web (`AuthLayout`) */
export const BrandGradient = {
  hero: [Brand.primaryDark, Brand.primary, Brand.primaryLight] as const,
  logo: [Brand.primary, Brand.primaryLight] as const,
};

export function primaryGlowShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: Brand.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }) as ViewStyle;
}

export function cardElevationShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
    },
    android: { elevation: 4 },
    default: {},
  }) as ViewStyle;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
