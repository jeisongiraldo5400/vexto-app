# Vexto — app móvil

App Expo 54 / React Native para consulta de productos, inventario, ventas,
reparaciones y chat de ventas. Usa Expo Router, React Query y Zustand.

## Desarrollo

Requiere Node.js 22 y npm 10. Se mantiene únicamente `package-lock.json`.

```bash
npm ci
cp .env.example .env.local
npm start
```

Configurar `EXPO_PUBLIC_API_BASE_URL` con la URL de la API, incluido `/v1/api`.
En un dispositivo físico, usar una dirección accesible desde la red del teléfono.
Para iniciar plataformas específicas: `npm run android` o `npm run ios`.

La sesión se guarda con Expo SecureStore. Las respuestas 401 comparten una sola
renovación; un 401 tardío reintenta con el token actualizado. Los fallos de red
no borran la sesión y una respuesta tardía no restaura una sesión cerrada.

## Verificaciones

```bash
npm run typecheck
npm run lint
npm test
```

Las pruebas de Vitest cubren la coordinación del cliente HTTP sin emulador ni
llamadas externas. La validación de cámara, SecureStore nativo y navegación
requiere un dispositivo o emulador.

El workflow `.github/workflows/ci.yml` ejecuta tipos, lint y pruebas. Las builds
nativas se gestionan con la configuración existente de `eas.json`.


## Sesiones y reintentos

Al cambiar empresa se cancelan consultas, se elimina la caché anterior, se limpia
el chat y se remontan pantallas para descartar el carrito local. Reparaciones usa
claves por empresa. Rutas y pestañas respetan módulos/permisos. Logout intenta
revocar en el servidor y elimina credenciales locales; si falla la conexión,
informa que la revocación remota no pudo confirmarse. Las peticiones tienen un
timeout de 30 segundos. Una venta reintentada conserva su clave de idempotencia
hasta confirmar éxito, dentro del proceso de la app.

La actualización compatible redujo `npm audit` de 54 a 43 avisos y eliminó los
2 críticos. Ver `DEPENDENCIAS-PENDIENTES.md`: no todos los avisos tienen un parche
compatible publicado para esta combinación de Expo/React Native. No usar
`npm audit fix --force` como sustituto de una migración de SDK validada.
