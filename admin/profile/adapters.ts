import { useAuthStore } from "@/admin/auth/store/auth-store";
import { apiFetch } from "@/core/http/api";
import { loadSession, saveSession } from "@/core/session/secure-session";

export const MIN_PASSWORD = 8;

export type PasswordForm = {
  passwordActual: string;
  nuevaPassword: string;
  confirmarPassword: string;
};

export function validatePasswordForm(v: PasswordForm): string | null {
  if (!v.passwordActual) return "La contraseña actual es obligatoria.";
  if (v.nuevaPassword.length < MIN_PASSWORD)
    return `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (v.nuevaPassword !== v.confirmarPassword)
    return "Las contraseñas no coinciden.";
  if (v.nuevaPassword === v.passwordActual)
    return "La nueva contraseña debe ser distinta a la actual.";
  return null;
}

/** El backend cierra todas las sesiones del usuario al cambiarla. */
export function cambiarPassword(v: PasswordForm) {
  return apiFetch<void>("usuarios/me/password", { method: "PATCH", body: v });
}

const PHONE = /^[0-9+\-\s()]*$/;

export function validatePerfil(fullName: string, phone: string): string | null {
  if (fullName.trim().length < 3)
    return "El nombre debe tener al menos 3 caracteres.";
  if (!PHONE.test(phone.trim())) return "Teléfono inválido.";
  return null;
}

/**
 * Actualiza nombre (y teléfono si se escribe) y refleja el nombre en la sesión
 * guardada para que el encabezado lo muestre sin volver a iniciar sesión.
 */
export async function actualizarPerfil(
  userId: string,
  fullName: string,
  phone: string,
) {
  await apiFetch(`usuarios/${userId}`, {
    method: "PUT",
    body: {
      fullName: fullName.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    },
  });
  const session = await loadSession();
  if (session && session.user.id === userId) {
    const user = { ...session.user, fullName: fullName.trim() };
    await saveSession({ ...session, user });
    useAuthStore.setState({ user });
  }
}
