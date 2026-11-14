import { useAuthStore } from "@/admin/auth/store/auth-store";
import { ApiError } from "@/core/http/api-error";
import { canAccess, CAJA_PERMISOS } from "@/core/permissions";
import type { AuthUser } from "@/core/types";
import type { QueryClient } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { Alert } from "react-native";

/** Código con el que el backend rechaza un cobro o reembolso sin caja abierta (409). */
export const CAJA_NO_ABIERTA = "CAJA_NO_ABIERTA";
export const CAJA_ROUTE = "/(app)/caja";
/** Raíz de las consultas de caja (TanStack Query). */
export const CAJA_QUERY_KEY = ["caja"] as const;

export const CAJA_NO_ABIERTA_TITULO = "Caja cerrada";
export const CAJA_NO_ABIERTA_MENSAJE =
  "Necesitas una caja abierta para registrar cobros o reembolsos.";

/** La empresa tiene el módulo `caja`: los cobros exigen caja abierta. */
export function cajaHabilitada(user: AuthUser | null | undefined): boolean {
  return !!user?.modulosHabilitados?.includes("caja");
}

/** Módulo habilitado y algún permiso de caja: puede consultar su sesión. */
export function puedeUsarCaja(user: AuthUser | null | undefined): boolean {
  return canAccess(user ?? null, "caja", ...CAJA_PERMISOS);
}

export function isCajaNoAbierta(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === CAJA_NO_ABIERTA;
}

/**
 * Aviso de caja cerrada. Con permiso `caja:abrir` ofrece ir a abrirla; sin él,
 * explica a quién acudir.
 */
export function promptAbrirCaja(
  user: AuthUser | null = useAuthStore.getState().user,
): void {
  if (canAccess(user, "caja", "caja:abrir")) {
    Alert.alert(
      CAJA_NO_ABIERTA_TITULO,
      `${CAJA_NO_ABIERTA_MENSAJE} ¿Quieres abrir tu caja ahora?`,
      [
        { text: "Ahora no", style: "cancel" },
        { text: "Abrir caja", onPress: () => router.push(CAJA_ROUTE as Href) },
      ],
    );
    return;
  }
  Alert.alert(
    CAJA_NO_ABIERTA_TITULO,
    `${CAJA_NO_ABIERTA_MENSAJE} Tu usuario no tiene permiso para abrir caja; pide a un administrador que te lo asigne.`,
    [{ text: "Entendido", style: "cancel" }],
  );
}

/**
 * Manejo único de `CAJA_NO_ABIERTA` para todos los flujos de cobro (venta, crédito,
 * abonos, separados, reparaciones, reembolsos). Devuelve `true` si el error era ese:
 * muestra el aviso con acceso a la caja y refresca el estado de caja en caché.
 */
export function handleCajaNoAbierta(
  error: unknown,
  queryClient?: QueryClient,
): boolean {
  if (!isCajaNoAbierta(error)) return false;
  void queryClient?.invalidateQueries({ queryKey: CAJA_QUERY_KEY });
  promptAbrirCaja();
  return true;
}
