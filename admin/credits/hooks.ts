import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { useMetodosPagoQuery } from "@/admin/sales/hooks/use-metodos-pago-query";
import { esCreditoInterno } from "@/admin/sales/constants/metodos-pago";
import { newIdempotencyIntent } from "@/core/http/idempotent";
import { parseMonto } from "@/core/utils/money";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  fetchAbonosCredito,
  fetchCredito,
  fetchCreditos,
  registrarAbonoCredito,
  saldoTotal,
  type Credito,
} from "./adapters";

/** Tras un abono cambian créditos, pagos, ventas y el tablero. */
export const CREDITOS_INVALIDATE = [
  ["creditos"],
  ["pagos"],
  ["ventas"],
  ["dashboard"],
];

export function useCreditosQuery(estado: string, page: number) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["creditos", empresaId, "lista", estado, page],
    queryFn: () => fetchCreditos(estado, page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreditoQuery(id: string) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["creditos", empresaId, "detalle", id],
    queryFn: () => fetchCredito(id),
    enabled: enabled && !!id,
  });
}

export function useAbonosCreditoQuery(
  credito: Pick<Credito, "id" | "ventaId">,
  allowed: boolean,
) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["pagos", empresaId, "credito", credito.id],
    queryFn: () => fetchAbonosCredito(credito.ventaId, credito.id),
    enabled: enabled && allowed && !!credito.ventaId,
  });
}

/** Métodos activos para abonar (sin el crédito interno). */
export function useMetodosAbono() {
  const q = useMetodosPagoQuery();
  const options = (q.data ?? [])
    .filter((m) => m.estado === "activo" && !esCreditoInterno(m.codigo))
    .map((m) => ({ id: m.id, nombre: m.nombre }));
  return { ...q, options };
}

/** Abono a crédito con intención idempotente (igual en reintentos, nueva tras el éxito). */
export function useAbonoCreditoForm(
  credito: Pick<Credito, "id" | "ventaId" | "saldoPendiente" | "saldoPendienteTotal">,
) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const intent = useRef<string | null>(null);
  const saldo = saldoTotal(credito);
  const monto = parseMonto(amount);
  const error =
    amount === ""
      ? null
      : !(monto > 0)
        ? "Monto inválido"
        : monto > saldo
          ? "El abono supera el saldo pendiente"
          : null;
  const invalid = !method || !(monto > 0) || monto > saldo;
  const pay = async () => {
    intent.current ??= newIdempotencyIntent();
    const res = await registrarAbonoCredito(
      {
        ventaId: credito.ventaId,
        creditoId: credito.id,
        monto,
        metodoPagoId: method,
        observaciones: notes.trim() || undefined,
      },
      intent.current,
    );
    intent.current = null;
    setAmount("");
    setNotes("");
    return res;
  };
  return {
    amount,
    setAmount,
    method,
    setMethod,
    notes,
    setNotes,
    monto,
    saldo,
    error,
    invalid,
    pay,
  };
}
