import { handleCajaNoAbierta } from "@/core/caja/caja-guard";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Alert } from "react-native";

export type RepairRun = (fn: () => Promise<unknown>) => Promise<void>;

/**
 * Ejecuta una acción del detalle a la vez: bloquea reentradas, invalida
 * `reparaciones` tras el éxito y muestra el error en un Alert.
 */
export function useRepairRunner() {
  const qc = useQueryClient();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const run: RepairRun = async (fn) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["reparaciones"] });
    } catch (e) {
      if (handleCajaNoAbierta(e, qc)) return;
      Alert.alert(
        "No se pudo completar",
        e instanceof Error ? e.message : "Intenta nuevamente",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { busy, run };
}
