import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { newIdempotencyIntent } from "@/core/http/idempotent";
import { formatMontoInput, parseMonto } from "@/core/utils/money";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  crearPago,
  fetchPagos,
  fetchVentaPagable,
  type VentaPagable,
} from "./adapters";

export const PAGOS_INVALIDATE = [
  ["pagos"],
  ["creditos"],
  ["ventas"],
  ["dashboard"],
];

export function usePagosQuery(estado: string, page: number) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["pagos", empresaId, "lista", estado, page],
    queryFn: () => fetchPagos(estado, page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Registro de pago a una venta buscada por factura, con intención idempotente. */
export function usePagoForm() {
  const [factura, setFactura] = useState("");
  const [venta, setVenta] = useState<VentaPagable | null>(null);
  const [saldo, setSaldo] = useState(0);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const intent = useRef<string | null>(null);

  const buscar = async () => {
    if (!factura.trim() || searching) return;
    setSearching(true);
    setLookupError(null);
    try {
      const res = await fetchVentaPagable(factura);
      setVenta(res.venta);
      setSaldo(res.saldo);
      setAmount(res.saldo > 0 ? formatMontoInput(res.saldo) : "");
      // Otra venta es otra intención de pago.
      intent.current = null;
    } catch (e) {
      setVenta(null);
      setLookupError(e instanceof Error ? e.message : "Venta no encontrada");
    } finally {
      setSearching(false);
    }
  };

  const monto = parseMonto(amount);
  const error =
    !venta || amount === ""
      ? null
      : !(monto > 0)
        ? "Monto inválido"
        : monto > saldo
          ? "El pago supera el saldo pendiente"
          : null;
  const invalid = !venta || !method || !(monto > 0) || monto > saldo;

  const pay = async () => {
    if (!venta) throw new Error("Busca la venta primero");
    intent.current ??= newIdempotencyIntent();
    const res = await crearPago(
      {
        ventaId: venta.id,
        monto,
        metodoPagoId: method,
        referencia: reference.trim() || undefined,
        observaciones: notes.trim() || undefined,
      },
      intent.current,
    );
    intent.current = null;
    return res;
  };

  return {
    factura,
    setFactura,
    venta,
    saldo,
    lookupError,
    searching,
    buscar,
    amount,
    setAmount,
    method,
    setMethod,
    reference,
    setReference,
    notes,
    setNotes,
    monto,
    error,
    invalid,
    pay,
  };
}
