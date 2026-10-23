import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { newIdempotencyIntent } from "@/core/http/idempotent";
import { parseMonto } from "@/core/utils/money";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  MIN_OBSERVACIONES_CANCELACION,
  abonarSeparado,
  cancelarSeparado,
  fetchSeparado,
  fetchSeparados,
} from "./adapters";

/** Claves que cambian tras operar un separado (lista, detalle, stock, tablero). */
export const SEPARADOS_INVALIDATE = [
  ["separados"],
  ["stock"],
  ["productos"],
  ["dashboard"],
];

export function useSeparadosQuery(estado: string, page: number) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["separados", empresaId, "lista", estado, page],
    queryFn: () => fetchSeparados(estado, page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSeparadoQuery(id: string) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["separados", empresaId, "detalle", id],
    queryFn: () => fetchSeparado(id),
    enabled: enabled && !!id,
  });
}

/** Abono con intención idempotente: igual en reintentos, nueva tras el éxito. */
export function useAbonoSeparadoForm(id: string, saldo: number) {
  const [amount, setAmount] = useState("");
  const intent = useRef<string | null>(null);
  const monto = parseMonto(amount);
  const error =
    amount === ""
      ? null
      : !(monto > 0)
        ? "Monto inválido"
        : monto > saldo
          ? "El abono supera el saldo pendiente"
          : null;
  const invalid = !(monto > 0) || monto > saldo;
  const pay = async () => {
    intent.current ??= newIdempotencyIntent();
    await abonarSeparado(id, monto, intent.current);
    intent.current = null;
    setAmount("");
  };
  return { amount, setAmount, monto, error, invalid, pay };
}

/** Cancelación: el motivo es obligatorio (mínimo 5 caracteres). */
export function useCancelarSeparadoForm(id: string) {
  const [observaciones, setObservaciones] = useState("");
  const invalid = observaciones.trim().length < MIN_OBSERVACIONES_CANCELACION;
  const cancel = () => cancelarSeparado(id, observaciones);
  return { observaciones, setObservaciones, invalid, cancel };
}
