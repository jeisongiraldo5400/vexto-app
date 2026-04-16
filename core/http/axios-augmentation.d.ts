import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** No enviar X-Company-Id (rutas /auth que solo usan JWT). */
    skipCompanyHeader?: boolean;
    /** Evita bucle infinito al reintentar tras refresh. */
    _retry401?: boolean;
  }
}
