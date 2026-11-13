# Dependencias pendientes de revisión

Auditoría npm (`npm audit`, incluye dependencias de desarrollo) del 11 de noviembre de 2026, tras migrar a **Expo SDK 58**.

## Estado actual

`npm audit` y `npm audit --omit=dev`: **0 vulnerabilidades**.

| Paquete | Antes | Ahora |
|---|---|---|
| expo | 54.0.38 | 58.0.24 |
| react-native | 0.81.5 | 0.88.1 |
| react / react-dom | 19.1.0 | 19.3.0 |
| expo-router | 6.0.23 | 58.0.31 |
| react-native-reanimated / worklets | 4.1 / 0.5.1 | 4.7.1 / 0.13.0 |
| typescript | 5.9 | 6.0.3 |
| eslint-config-expo | 10.0.0 | 58.0.4 |

Desde SDK 55 todos los paquetes del SDK comparten la versión mayor (`expo-camera` 58.x, etc.). El salto se hizo directo a 58 con `npx expo install expo@^58.0.0 --fix` aplicando las notas de 55, 56, 57 y 58.

## Avisos resueltos

Antes de migrar había 31 avisos (1 bajo, 24 moderados, 6 altos); con `--omit=dev`, 24.

| Dependencia | Cómo se resolvió |
|---|---|
| node-forge (vía `@expo/cli`) | El CLI de SDK 58 ya no depende de node-forge. |
| image-size (vía `metro` 0.83) | Metro de SDK 58 usa una versión corregida. |
| decode-uri-component (vía `query-string` 7 de expo-router 6) | expo-router 58 ya no usa `query-string` 7. |
| glob, deepmerge, fast-uri | Desaparecen con el árbol de SDK 58. |
| follow-redirects 1.16.1 (vía `axios`) | `axios` ^1.15.0 → ^1.21.1 (trae follow-redirects 1.16.3). |
| minimatch 10.x (vía `@expo/fingerprint` y `@typescript-eslint/typescript-estree`) | GHSA-g3hv-75wg-m249 solo está corregido en 11.0.1+ (no hay parche en 10.x). Override `"minimatch@^10.0.0": "^11.0.8"`. Ambos paquetes solo usan `new Minimatch()`, `.match`, `.pattern`, `.negate` y `minimatch()`, que siguen en la v11 (la v11 quita `makeRe`, `AST`, `matchOne`, etc.). Solo afecta herramientas (fingerprint del CLI y ESLint). Quitar el override cuando esos paquetes pidan `^11`. |

> Nota: npm 10.9 falla con `Cannot read properties of null (reading 'edgesOut')` al recalcular el árbol; la instalación se hizo con `npx npm@11 install` (para `npx expo install` se puso npm 11 primero en el `PATH`). El lockfile sigue en formato v3 y `npm ci` de npm 10 lo acepta.

## Cambios de código por la migración

- **Expo Router ya no depende de React Navigation (SDK 56):** se quitaron `@react-navigation/native`, `@react-navigation/bottom-tabs` y `@react-navigation/elements` de `package.json`. Importaciones migradas a `expo-router/react-navigation` (`ThemeProvider`, `DarkTheme`, `DefaultTheme`, `useFocusEffect`, `PlatformPressable`) y `expo-router/js-tabs` (`BottomTabBarButtonProps`). El mock de pruebas en `test-utils/setup.ts` apunta a la nueva ruta.
- **API estricta de TypeScript de React Native 0.88 (SDK 58):**
  - Las refs de `ScrollView` usan `ScrollViewInstance` (`admin/expenses/expenses-screen.tsx`, `components/ui/kit.tsx`).
  - `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` (`admin/sales/components/barcode-scanner-modal.tsx`).
  - `ListEmptyComponent` ya no acepta `null` (`admin/units/index.tsx`).
  - `IconSymbol` recibe `ColorValue` (el color de la barra de tabs) y el mapa usa el tipo `SFSymbol` de `expo-symbols` (`components/ui/icon-symbol*.tsx`).
- **Reglas nuevas de `eslint-plugin-react-hooks` (eslint-config-expo 58):** `Option` de `app/(app)/(tabs)/mas.tsx` pasó a nivel de módulo (`react-hooks/static-components`).

## app.json

- Eliminados `newArchEnabled` y `android.edgeToEdgeEnabled` (quitados en SDK 55: la nueva arquitectura y edge-to-edge son obligatorios).
- `android.usesCleartextTraffic: false` se movió al plugin `expo-build-properties` (`android.usesCleartextTraffic`). Verificado en el manifiesto generado (`android:usesCleartextTraffic="false"`).
- La carpeta `ios/` (generada, en `.gitignore`) se regeneró para SDK 58 con `expo run:ios`.

## Pendiente

### expo-doctor

19/20 comprobaciones correctas. Falla solo el esquema de `app.json` por el icono:

- `icon` y `android.adaptiveIcon.*` usan `assets/logo/vexto.png` (216×198, con transparencia); deben ser imágenes cuadradas. No se corrigió: rellenar a 216×216 haría pasar la comprobación, pero el icono seguiría siendo inválido (iOS pide 1024×1024 sin transparencia y el `foregroundImage` adaptativo necesita margen de zona segura); escalarlo degradaría el logo. Hace falta un original en alta resolución o vectorial para generar `icon` (1024×1024) y las capas adaptativas de Android.

### ESLint fuera de las carpetas de `expo lint`

`npm run lint` (`expo lint`) pasa sin errores. `npx eslint .` sobre todo el repo reporta errores nuevos de las reglas del React Compiler (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/purity`) en `admin/` y `hooks/use-color-scheme.web.ts`, más `import/first` en `core/utils/date.test.ts`. Son patrones existentes que las reglas nuevas detectan; corregirlos cambia el comportamiento de los componentes y queda para una revisión aparte.

### Otros cambios de comportamiento de SDK 58 a tener en cuenta

- **Android R8** activo por defecto en builds de release (`android.enableMinifyInReleaseBuilds`). Si alguna librería usa reflexión, añadir reglas ProGuard o desactivarlo con `expo-build-properties`.
- **iOS**: ciclo de vida basado en escenas (`SceneDelegate`), mínimo iOS 16.4 (desde SDK 56) y Xcode 26.4+.
- **Hermes v1** es el motor por defecto (desde SDK 56).
- **`fetch` global** es `expo/fetch` (desde SDK 56); `axios` usa `XMLHttpRequest`, así que no cambia.
- `@expo/vector-icons` está en desuso (SDK 56) en favor de `@react-native-vector-icons/*`; sigue declarado explícitamente en `package.json`.
- Overrides `postcss`, `brace-expansion@^1.0.0` y `ws@6.2.3` siguen en `package.json`; `ws@6.2.3` ya no aparece en el árbol y se puede quitar.
- Se necesita una nueva build de desarrollo (dev client) para SDK 58; la de SDK 54 no es compatible.
