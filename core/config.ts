import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

  const url = (raw ?? '').trim().replace(/\/$/, '');
  if (!url) {
    throw new Error(
      'Falta EXPO_PUBLIC_API_BASE_URL (o expo.extra.apiBaseUrl). Créala en .env.local y reinicia Expo. Ej.: emulador Android http://10.0.2.2:3001/v1/api — ver .env.example',
    );
  }
  return url;
}
