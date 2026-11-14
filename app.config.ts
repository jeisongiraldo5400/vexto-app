import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración dinámica sobre `app.json`.
 *
 * El acceso a la red local (ATS `NSAllowsLocalNetworking` y el permiso
 * `NSLocalNetworkUsageDescription`) solo se necesita para apuntar a un backend
 * en la LAN durante el desarrollo; en producción se elimina.
 */
const isProduction =
  process.env.EAS_BUILD_PROFILE === 'production' || process.env.APP_VARIANT === 'production';

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (!isProduction || !base.ios?.infoPlist) return base;

  const {
    NSLocalNetworkUsageDescription: _localNetwork,
    NSAppTransportSecurity,
    ...infoPlist
  } = base.ios.infoPlist as Record<string, unknown>;
  const { NSAllowsLocalNetworking: _allowsLocal, ...ats } =
    (NSAppTransportSecurity as Record<string, unknown> | undefined) ?? {};

  return {
    ...base,
    ios: {
      ...base.ios,
      infoPlist: {
        ...infoPlist,
        ...(Object.keys(ats).length > 0 ? { NSAppTransportSecurity: ats } : {}),
      },
    },
  };
};
