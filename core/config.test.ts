import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApiBaseUrl } from './config';

const device = vi.hoisted(() => ({ isDevice: false }));
vi.mock('expo-device', () => ({
  get isDevice() {
    return device.isDevice;
  },
}));

const g = globalThis as { __DEV__?: boolean };
const expoConfig = (Constants as unknown as { expoConfig: { hostUri?: string; extra?: Record<string, unknown> } }).expoConfig;

const ENV_KEYS = ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_API_PATH', 'EXPO_PUBLIC_DEV_API_PORT', 'EXPO_PUBLIC_DEV_WEB_HOST'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  g.__DEV__ = true;
  device.isDevice = false;
  Platform.OS = 'ios';
  expoConfig.hostUri = '';
  expoConfig.extra = {};
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  g.__DEV__ = true;
  Platform.OS = 'ios';
});

describe('getApiBaseUrl', () => {
  it('usa EXPO_PUBLIC_API_BASE_URL sin barra final', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = '  https://api.example.test/v1/api/ ';
    expect(getApiBaseUrl()).toBe('https://api.example.test/v1/api');
  });

  it('en producción exige HTTPS (env y extra)', () => {
    g.__DEV__ = false;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.example.test';
    expect(() => getApiBaseUrl()).toThrow(/HTTPS/);
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expoConfig.extra = { apiBaseUrl: 'http://api.example.test' };
    expect(() => getApiBaseUrl()).toThrow(/HTTPS/);
    expoConfig.extra = { apiBaseUrl: 'https://api.example.test/' };
    expect(getApiBaseUrl()).toBe('https://api.example.test');
  });

  it('en producción sin URL configurada falla en vez de inferir', () => {
    g.__DEV__ = false;
    expect(() => getApiBaseUrl()).toThrow(/Falta EXPO_PUBLIC_API_BASE_URL/);
  });

  it('en desarrollo infiere el host del packager con puerto y ruta configurables', () => {
    expoConfig.hostUri = '192.168.1.20:8082';
    expect(getApiBaseUrl()).toBe('http://192.168.1.20:3001/v1/api');
    process.env.EXPO_PUBLIC_DEV_API_PORT = '4000';
    process.env.EXPO_PUBLIC_API_PATH = 'api';
    expect(getApiBaseUrl()).toBe('http://192.168.1.20:4000/api');
  });

  it('soporta hostUri IPv6 y con protocolo', () => {
    expoConfig.hostUri = 'http://[::1]:8082/path';
    expect(getApiBaseUrl()).toBe('http://[::1]:3001/v1/api');
  });

  it('en túnel de Expo cae al loopback del simulador', () => {
    expoConfig.hostUri = 'abc.exp.direct:80';
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:3001/v1/api');
    Platform.OS = 'android';
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3001/v1/api');
  });

  it('en dispositivo físico sin host inferible pide configurar la URL', () => {
    device.isDevice = true;
    expect(() => getApiBaseUrl()).toThrow(/dispositivo físico/);
  });

  it('en web usa EXPO_PUBLIC_DEV_WEB_HOST o localhost', () => {
    Platform.OS = 'web';
    expect(getApiBaseUrl()).toBe('http://localhost:3001/v1/api');
    process.env.EXPO_PUBLIC_DEV_WEB_HOST = 'pc.local';
    expect(getApiBaseUrl()).toBe('http://pc.local:3001/v1/api');
  });
});
