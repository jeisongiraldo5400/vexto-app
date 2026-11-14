import { loadSession } from "@/core/session/secure-session";
import { apiFetch } from "./api";
import { ApiError } from "./api-error";

const pending = new Map<string, string>();

const randomId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/**
 * Identificador de una intención de envío (un formulario abierto). Debe renovarse
 * tras el éxito para que dos operaciones reales con el mismo payload no compartan clave.
 */
export function newIdempotencyIntent(): string {
  return randomId();
}

/** 4xx definitivo: el servidor rechazó la petición y no la registró; no se reintenta igual. */
function isDefinitiveRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![408, 425, 429].includes(error.status)
  );
}

/**
 * POST con `Idempotency-Key`. La clave se conserva solo para reintentar la misma
 * intención tras un resultado desconocido (red, timeout, 5xx); se descarta al
 * confirmar éxito o ante un 4xx definitivo.
 *
 * `intent` separa intenciones distintas con payload idéntico (p. ej. dos abonos del
 * mismo monto). Sin `intent`, se agrupa por usuario, empresa, ruta y payload.
 */
export async function postIdempotent<T>(
  path: string,
  body: unknown,
  intent?: string,
): Promise<T> {
  const session = await loadSession();
  const fingerprint = JSON.stringify([
    session?.user.id,
    session?.empresaId,
    path,
    intent ?? null,
    body,
  ]);
  let key = pending.get(fingerprint);
  if (!key) {
    key = `mobile-${randomId()}`;
    pending.set(fingerprint, key);
  }
  try {
    const result = await apiFetch<T>(path, {
      method: "POST",
      body,
      headers: { "Idempotency-Key": key },
    });
    pending.delete(fingerprint);
    return result;
  } catch (error) {
    if (isDefinitiveRejection(error)) pending.delete(fingerprint);
    throw error;
  }
}
