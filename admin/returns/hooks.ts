import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { evaluarReembolso } from "@/admin/cash-register/cobro";
import { cajaHabilitada } from "@/core/caja/caja-guard";
import { newIdempotencyIntent } from "@/core/http/idempotent";
import { parseCantidad } from "@/core/utils/money";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  cargarVentaParaDevolucion,
  crearDevolucionCliente,
  fetchDevolucion,
  fetchDevoluciones,
  type VentaParaDevolucion,
} from "./adapters";

/** Una devolución mueve stock y totales de ventas. */
export const DEVOLUCIONES_INVALIDATE = [
  ["devoluciones"],
  ["stock"],
  ["productos"],
  ["ventas"],
  ["dashboard"],
];

export function useDevolucionesQuery(tipo: string, page: number) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["devoluciones", empresaId, "lista", tipo, page],
    queryFn: () => fetchDevoluciones(tipo, page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDevolucionQuery(id: string) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["devoluciones", empresaId, "detalle", id],
    queryFn: () => fetchDevolucion(id),
    enabled: enabled && !!id,
  });
}

/**
 * Devolución de cliente sobre una venta buscada por factura. Con el módulo caja se
 * puede reembolsar dinero; el tope (valor devuelto y saldo reembolsable) lo valida
 * el backend porque la venta cargada no trae precios.
 */
export function useDevolucionForm() {
  const conCaja = cajaHabilitada(useAuthStore((s) => s.user));
  const [refundMethod, setRefundMethod] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const reembolso = conCaja
    ? evaluarReembolso(refundMethod, refundAmount)
    : { error: null, reembolso: undefined };
  const [factura, setFactura] = useState("");
  const [venta, setVenta] = useState<VentaParaDevolucion | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");
  const intent = useRef<string | null>(null);

  const buscar = async () => {
    if (!factura.trim() || searching) return;
    setSearching(true);
    setLookupError(null);
    try {
      setVenta(await cargarVentaParaDevolucion(factura));
      setCantidades({});
      intent.current = null;
    } catch (e) {
      setVenta(null);
      setLookupError(e instanceof Error ? e.message : "Venta no encontrada");
    } finally {
      setSearching(false);
    }
  };

  const setCantidad = (productoId: string, v: string) =>
    setCantidades((c) => ({ ...c, [productoId]: v }));

  const lineas = (venta?.items ?? [])
    .map((i) => ({
      productoId: i.productoId,
      cantidad: cantidades[i.productoId]
        ? parseCantidad(cantidades[i.productoId])
        : 0,
      max: i.cantidadPendienteDevolver,
    }))
    .filter((l) => l.cantidad !== 0);

  const error = !venta
    ? null
    : lineas.some((l) => !Number.isFinite(l.cantidad) || l.cantidad < 0)
      ? "Cantidades inválidas."
      : lineas.some((l) => l.cantidad > l.max)
        ? "Una cantidad supera lo pendiente por devolver."
        : lineas.length === 0
          ? "Indica al menos una cantidad a devolver."
          : reembolso.error;

  const submit = async () => {
    if (!venta || error) throw new Error(error ?? "Busca la venta primero");
    intent.current ??= newIdempotencyIntent();
    const res = await crearDevolucionCliente(
      {
        ventaId: venta.id,
        almacenId: venta.almacenId,
        items: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
        })),
        motivo: motivo.trim() || undefined,
        ...(reembolso.reembolso ? { reembolso: reembolso.reembolso } : {}),
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
    lookupError,
    searching,
    buscar,
    cantidades,
    setCantidad,
    motivo,
    setMotivo,
    conCaja,
    refundMethod,
    setRefundMethod,
    refundAmount,
    setRefundAmount,
    reembolso,
    unidades: lineas.reduce((a, l) => a + (l.cantidad > 0 ? l.cantidad : 0), 0),
    error,
    submit,
  };
}
