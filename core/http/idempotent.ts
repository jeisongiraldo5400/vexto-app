import { loadSession } from "@/core/session/secure-session";
import { apiFetch } from "./api";

const pending = new Map<string, string>();
export async function postIdempotent<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const session = await loadSession();
  const fingerprint = JSON.stringify([
    session?.user.id,
    session?.empresaId,
    path,
    body,
  ]);
  let key = pending.get(fingerprint);
  if (!key) {
    key = `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    pending.set(fingerprint, key);
  }
  const result = await apiFetch<T>(path, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": key },
  });
  pending.delete(fingerprint);
  return result;
}
