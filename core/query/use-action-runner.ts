import { handleCajaNoAbierta } from "@/core/caja/caja-guard";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Alert } from "react-native";

export type ActionRun = (fn: () => Promise<unknown>) => Promise<boolean>;

/**
 * Ejecuta una acción a la vez (bloquea dobles toques), invalida `invalidate`
 * tras el éxito y muestra el error en un Alert (`CAJA_NO_ABIERTA` ofrece abrir la
 * caja). Devuelve `true` si tuvo éxito.
 */
export function useActionRunner(invalidate: QueryKey[]) {
  const qc = useQueryClient();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const run: ActionRun = async (fn) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    try {
      await fn();
      await Promise.all(
        invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
      return true;
    } catch (e) {
      // Cobro sin caja abierta: aviso propio con acceso a la caja.
      if (handleCajaNoAbierta(e, qc)) return false;
      Alert.alert(
        "No se pudo completar",
        e instanceof Error ? e.message : "Intenta nuevamente",
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { busy, run };
}
