import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { useMetodosAbono } from "@/admin/credits/hooks";
import {
  CAJA_QUERY_KEY,
  cajaHabilitada,
  puedeUsarCaja,
} from "@/core/caja/caja-guard";
import { ApiError } from "@/core/http/api-error";
import { parseMonto } from "@/core/utils/money";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  abrirCaja,
  cerrarCaja,
  crearMovimientoCaja,
  fetchCajaActual,
  fetchCajaResumen,
  fetchCajaSesiones,
  type CajaSesionConResumen,
  type CajaSesionesFiltros,
  type TipoMovimientoManual,
} from "./adapters";
import { evaluarCierre, type ConteoDenominaciones } from "./cierre";
import { metodosDeCaja } from "./cobro";

/** Toda operación de caja cambia la sesión actual, el arqueo y el historial. */
export const CAJA_INVALIDATE = [[...CAJA_QUERY_KEY]];

export const MIN_MOTIVO_MOVIMIENTO = 3;

/** Códigos con los que el backend rechaza un cierre por datos del arqueo. */
const ERRORES_DE_ARQUEO = new Set([
  "CAJA_OBSERVACIONES_REQUERIDAS",
  "CAJA_DENOMINACIONES_NO_COINCIDEN",
]);

/** Caja abierta del usuario con su arqueo en vivo. */
export function useCajaActualQuery() {
  const empresaId = useAuthStore((s) => s.empresaId);
  const user = useAuthStore((s) => s.user);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: [...CAJA_QUERY_KEY, empresaId, "actual"],
    queryFn: fetchCajaActual,
    enabled: enabled && puedeUsarCaja(user),
    // El arqueo cambia con cada cobro: nunca se sirve de caché al volver a la pantalla.
    staleTime: 0,
  });
}

/**
 * Estado de la caja para los flujos de cobro. `bloqueaCobro` solo es `true` cuando
 * se sabe con certeza que el módulo está activo y el usuario no tiene caja abierta;
 * sin permisos de caja no se puede consultar y decide el backend (`CAJA_NO_ABIERTA`).
 */
export function useCajaStatus() {
  const user = useAuthStore((s) => s.user);
  const habilitada = cajaHabilitada(user);
  const consultable = puedeUsarCaja(user);
  const q = useCajaActualQuery();
  const sesion = q.data?.sesion ?? null;
  return {
    habilitada,
    consultable,
    isLoading: consultable && q.isLoading,
    sesion,
    abierta: !!sesion,
    bloqueaCobro: habilitada && consultable && q.isSuccess && !sesion,
    refetch: q.refetch,
  };
}
export type CajaStatus = ReturnType<typeof useCajaStatus>;

export function useCajaResumenQuery(id: string) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: [...CAJA_QUERY_KEY, empresaId, "resumen", id],
    queryFn: () => fetchCajaResumen(id),
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

export function useCajaSesionesQuery(
  filtros: CajaSesionesFiltros,
  page: number,
) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: [...CAJA_QUERY_KEY, empresaId, "sesiones", filtros, page],
    queryFn: () => fetchCajaSesiones(filtros, page),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

/**
 * Métodos con los que se puede mover dinero de caja (cobros, ingresos, retiros,
 * reembolsos). Solo se consultan si la empresa usa el módulo caja.
 */
export function useMetodosCaja() {
  const q = useMetodosAbono(cajaHabilitada(useAuthStore((s) => s.user)));
  return { ...q, options: metodosDeCaja(q.options) };
}

/** Apertura: base inicial (0 permitido), almacén y observaciones opcionales. */
export function useAbrirCajaForm() {
  const [base, setBase] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const baseNum = parseMonto(base);
  const error =
    base.trim() === ""
      ? "Indica la base inicial (usa 0 si abres sin efectivo)."
      : !Number.isFinite(baseNum)
        ? "Base inicial inválida."
        : observaciones.trim().length > 500
          ? "Las observaciones admiten máximo 500 caracteres."
          : null;
  const submit = () => {
    if (error) throw new Error(error);
    return abrirCaja({
      baseInicial: baseNum,
      ...(almacenId ? { almacenId } : {}),
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
    });
  };
  return {
    base,
    setBase,
    baseNum,
    almacenId,
    setAlmacenId,
    observaciones,
    setObservaciones,
    error,
    submit,
  };
}

/** Ingreso o retiro manual de la caja abierta. */
export function useMovimientoCajaForm() {
  const [tipo, setTipo] = useState<TipoMovimientoManual>("INGRESO");
  const [metodoId, setMetodoId] = useState("");
  const [amount, setAmount] = useState("");
  const [motivo, setMotivo] = useState("");
  const monto = parseMonto(amount);
  const error =
    amount !== "" && !(monto > 0)
      ? "Monto inválido."
      : motivo !== "" && motivo.trim().length < MIN_MOTIVO_MOVIMIENTO
        ? `El motivo debe tener al menos ${MIN_MOTIVO_MOVIMIENTO} caracteres.`
        : null;
  const invalid =
    !metodoId ||
    !(monto > 0) ||
    motivo.trim().length < MIN_MOTIVO_MOVIMIENTO ||
    motivo.trim().length > 500;
  const submit = async () => {
    const res = await crearMovimientoCaja({
      tipo,
      metodoPagoId: metodoId,
      monto,
      motivo: motivo.trim(),
    });
    setAmount("");
    setMotivo("");
    return res;
  };
  return {
    tipo,
    setTipo,
    metodoId,
    setMetodoId,
    amount,
    setAmount,
    monto,
    motivo,
    setMotivo,
    error,
    invalid,
    submit,
  };
}

/**
 * Arqueo de cierre. `esperado` es el efectivo esperado en vivo; el backend lo
 * recalcula al cerrar, así que un rechazo por arqueo (`serverError`) se muestra en
 * el formulario para corregir sin perder lo contado.
 */
export function useCerrarCajaForm(sesionId: string, esperado: number) {
  const [contado, setContado] = useState("");
  const [usarDenominaciones, setUsarDenominaciones] = useState(false);
  const [conteo, setConteo] = useState<ConteoDenominaciones>({});
  const [observaciones, setObservaciones] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const evaluacion = evaluarCierre({
    esperado,
    contadoTexto: contado,
    usarDenominaciones,
    conteo,
    observaciones,
  });

  const setCantidad = (valor: number, cantidad: string) =>
    setConteo((c) => ({ ...c, [valor]: cantidad }));

  /** Devuelve la caja cerrada, o `null` si el backend rechazó el arqueo. */
  const submit = async (): Promise<CajaSesionConResumen | null> => {
    if (!evaluacion.payload)
      throw new Error(evaluacion.error ?? "Arqueo inválido");
    setServerError(null);
    try {
      return await cerrarCaja(sesionId, evaluacion.payload);
    } catch (e) {
      if (e instanceof ApiError && e.code && ERRORES_DE_ARQUEO.has(e.code)) {
        setServerError(
          e.code === "CAJA_OBSERVACIONES_REQUERIDAS"
            ? "El efectivo esperado cambió mientras contabas y ahora hay diferencia. Revisa el arqueo actualizado y explica la diferencia en las observaciones."
            : "La suma de las denominaciones no coincide con el efectivo contado. Revisa las cantidades.",
        );
        return null;
      }
      throw e;
    }
  };

  return {
    contado,
    setContado,
    usarDenominaciones,
    setUsarDenominaciones,
    conteo,
    setCantidad,
    observaciones,
    setObservaciones,
    evaluacion,
    serverError,
    submit,
  };
}
export type CerrarCajaForm = ReturnType<typeof useCerrarCajaForm>;
