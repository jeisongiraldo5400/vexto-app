# Dependencias pendientes de revisión

Auditoría npm (`npm audit`, incluye dependencias de desarrollo) del 23 de octubre de 2026.

## Aplicado sin salir de Expo SDK 54

- `expo` 54.0.37 → 54.0.38 (parche del SDK). Trae `@expo/config-plugins` 54.0.6, que usa `xcode` 4 y elimina el aviso de `uuid` (GHSA-w5hq-g745-h8pq).
- `vitest` 4.1.11 → 4.1.12 (corrige `@vitest/mocker`, GHSA-qxg6-89mg-rqv8 y GHSA-xp26-3454-mjgp).
- `npx expo install --fix` / `--check`: "Dependencies are up to date".

Resultado: **de 13 avisos (8 moderados, 5 altos) a 8 (3 moderados, 5 altos)**.

> Nota: npm 10.9 falla con `Cannot read properties of null (reading 'edgesOut')` al recalcular el árbol para el cambio de vitest; la instalación se hizo con `npx npm@11 install`. El lockfile sigue en formato v3 y `npm ci` de npm 10 lo acepta.

## Pendiente (no se puede resolver con overrides compatibles)

| Dependencia | Severidad | Por qué no se aplicó |
|---|---|---|
| node-forge (vía `@expo/cli` y `@expo/code-signing-certificates`) → arrastra `expo` | high | El aviso GHSA-86w9-cpqp-85rv cubre **todas** las versiones publicadas (`*`, última 1.4.0). No existe versión corregida. La "solución" de npm (expo 44) es un downgrade incorrecto. Solo afecta al CLI (firma de actualizaciones), no al bundle de la app. |
| image-size 1.2.1 (vía `metro` 0.83) | high | Corregido solo en 2.0.3+. Metro 0.83 llama `imageSize(rutaDeArchivo)` y la v2 solo acepta buffers: un override rompería el empaquetado de assets. Requiere una versión de Metro que use la API v2 (SDK posterior). Solo afecta al servidor de desarrollo/exportación. |
| decode-uri-component 0.2.2 (vía `query-string` 7 de `expo-router` 6) | moderate | La 0.5.x corregida es solo ESM y `query-string` 7 la carga con `require`. npm propone expo-router 58 (cambio mayor de SDK). |

Estos tres requieren una migración de SDK (o un parche upstream de Expo/Metro). No se silenciaron alertas.

## expo-doctor

17/18 comprobaciones correctas. La que falla es el esquema de `app.json`:

- `android.usesCleartextTraffic` no es una propiedad válida en SDK 54 (se configura con `expo-build-properties`).
- `icon` y `android.adaptiveIcon.*` usan `assets/logo/vexto.png` (216×198); deben ser imágenes cuadradas.
