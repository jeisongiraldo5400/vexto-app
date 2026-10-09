# Dependencias pendientes de revisión

Auditoría npm del 9 de octubre de 2026 después de aplicar actualizaciones compatibles y overrides de PostCSS, brace-expansion y ws.

Resultado: **43 avisos (23 altos, 20 moderados, 0 críticos)**. El conteo incluye dependencias transitivas y herramientas de desarrollo; no equivale a demostrar exposición de una aplicación instalada.

No se forzó un cambio mayor de Expo/React Native. Para algunas bibliotecas, la última versión publicada consultada sigue incluida en el rango del aviso (por ejemplo braces 3.0.3, node-forge 1.4.0 y sprintf-js 1.1.3). Otras correcciones cambian el formato/API de importación de dependencias que usa el SDK.

| Dependencia raíz | Severidad npm | Rango afectado y aviso |
|---|---|---|
| braces | high | `<=3.0.3`: [braces vulnerable to stack-exhaustion denial of service through deeply nested patterns](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| decode-uri-component | moderate | `<=0.4.2`: [decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) |
| image-size | high | `>=1.2.0 <=2.0.2`: [image-size: JXL and HEIF parsers allow denial of service through infinite loops](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)<br>`>=0.6.3 <=2.0.2`: [image-size: ICNS parser allows denial of service through an infinite loop](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) |
| node-forge | high | `<=1.4.0`: [node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| sprintf-js | moderate | `<=1.1.3`: [sprintf-js vulnerable to denial of service through unbounded precision specifiers](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |
| uuid | moderate | `<11.1.1`: [uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

Reevaluar los avisos al publicarse parches y probar las actualizaciones con `expo install --check`, tipado, pruebas y exportaciones web/nativas. La migración de SDK también exige comprobar cámara, SecureStore, navegación, Reanimated y un build/dispositivo nativo. No se ha validado aquí la explotabilidad de cada aviso ni se han silenciado alertas de audit.
