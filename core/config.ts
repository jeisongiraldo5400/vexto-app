import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = 3001;
const DEFAULT_API_PATH = '/v1/api';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function parseHostFromExpoHostUri(hostUri: string): string | null {
  const trimmed = hostUri.trim();
  if (!trimmed) return null;
  const noProto = trimmed.replace(/^https?:\/\//i, '');
  const hostPort = noProto.split('/')[0] ?? '';
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end > 0) return hostPort.slice(1, end);
    return null;
  }
  const host = hostPort.split(':')[0];
  return host && host.length > 0 ? host : null;
}

function isExpoTunnelHost(host: string): boolean {
  return host.includes('exp.direct');
}

function devApiPathAndPort(): { path: string; port: number } {
  const pathRaw = process.env.EXPO_PUBLIC_API_PATH?.trim() || DEFAULT_API_PATH;
  const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
  const port = Number(process.env.EXPO_PUBLIC_DEV_API_PORT) || DEFAULT_API_PORT;
  return { path, port };
}

function inferDevApiBaseUrl(): string {
  const { path, port } = devApiPathAndPort();

  if (Platform.OS === 'web') {
    const host = process.env.EXPO_PUBLIC_DEV_WEB_HOST?.trim() || 'localhost';
    return `http://${host}:${port}${path}`;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const packagerHost = hostUri ? parseHostFromExpoHostUri(hostUri) : null;

  if (packagerHost && !isExpoTunnelHost(packagerHost)) {
    return `http://${packagerHost}:${port}${path}`;
  }

  if (isDevice) {
    throw new Error(
      'No se pudo inferir la URL del API en este dispositivo físico (túnel de Expo o sin hostUri). ' +
        'Define EXPO_PUBLIC_API_BASE_URL en .env.local (p. ej. URL ngrok del backend) o usa `expo start` en LAN sin --tunnel.',
    );
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}${path}`;
  }
  if (Platform.OS === 'ios') {
    return `http://127.0.0.1:${port}${path}`;
  }

  throw new Error(`Plataforma no soportada para inferencia del API: ${Platform.OS}`);
}

export function getApiBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }

  const fromExtra = (
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ?? ''
  ).trim();
  if (fromExtra) {
    return normalizeBaseUrl(fromExtra);
  }

  if (__DEV__) {
    return normalizeBaseUrl(inferDevApiBaseUrl());
  }

  throw new Error(
    'Falta EXPO_PUBLIC_API_BASE_URL (o expo.extra.apiBaseUrl). En producción debes definir la URL del API.',
  );
}
