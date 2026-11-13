import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  cobroPayload,
  evaluarCobro,
  evaluarReembolso,
  type MetodoCobro,
} from "@/admin/cash-register/cobro";
import { cajaHabilitada } from "@/core/caja/caja-guard";
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

/**
 * Abono con intención idempotente: igual en reintentos, nueva tras el éxito.
 * Con el módulo caja exige método de pago y admite efectivo recibido (`metodos`).
 */
export function useAbonoSeparadoForm(
  id: string,
  saldo: number,
  metodos: MetodoCobro[] = [],
) {
  const conCaja = cajaHabilitada(useAuthStore((s) => s.user));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [received, setReceived] = useState("");
  const intent = useRef<string | null>(null);
  const monto = parseMonto(amount);
  const cobro = evaluarCobro(
    conCaja ? metodos.find((m) => m.id === method) : undefined,
    monto,
    received,
  );
  const error =
    amount === ""
      ? null
      : !(monto > 0)
        ? "Monto inválido"
        : monto > saldo
          ? "El abono supera el saldo pendiente"
          : null;
  const invalid =
    !(monto > 0) ||
    monto > saldo ||
    (conCaja && (!method || !!cobro.error));
  const pay = async () => {
    intent.current ??= newIdempotencyIntent();
    await abonarSeparado(
      id,
      monto,
      intent.current,
      conCaja ? cobroPayload(method, cobro) : {},
    );
    intent.current = null;
    setAmount("");
    setReceived("");
  };
  return {
    conCaja,
    amount,
    setAmount,
    method,
    setMethod,
    received,
    setReceived,
    cobro,
    monto,
    error,
    invalid,
    pay,
  };
}

/**
 * Cancelación: el motivo es obligatorio (mínimo 5 caracteres). Con el módulo caja
 * se puede reembolsar al cliente hasta lo abonado (`abonado`).
 */
export function useCancelarSeparadoForm(id: string, abonado = 0) {
  const conCaja = cajaHabilitada(useAuthStore((s) => s.user));
  const [observaciones, setObservaciones] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const reembolso = conCaja
    ? evaluarReembolso(refundMethod, refundAmount, abonado)
    : { error: null, reembolso: undefined };
  const invalid =
    observaciones.trim().length < MIN_OBSERVACIONES_CANCELACION ||
    !!reembolso.error;
  const cancel = () => cancelarSeparado(id, observaciones, reembolso.reembolso);
  return {
    conCaja,
    observaciones,
    setObservaciones,
    refundMethod,
    setRefundMethod,
    refundAmount,
    setRefundAmount,
    reembolso,
    invalid,
    cancel,
  };
}
