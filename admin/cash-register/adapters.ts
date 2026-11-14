import { apiFetch, fetchEmpresas } from "@/core/http/api";
import { loadSession } from "@/core/session/secure-session";

export type EstadoCaja = "ABIERTA" | "CERRADA" | "REVISADA";
export type TipoMovimientoCaja = "INGRESO" | "RETIRO" | "REEMBOLSO";
export type TipoMovimientoManual = "INGRESO" | "RETIRO";

export type Denominacion = { valor: number; cantidad: number };

export type CajaSesion = {
  id: string;
  usuarioId: string;
  usuarioNombre: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  almacenId: string | null;
  almacenNombre: string | null;
  baseInicial: number;
  estado: EstadoCaja;
  abiertaAt: string;
  cerradaAt: string | null;
  /** Distinto de `usuarioId` en un cierre forzado. */
  cerradaPor: string | null;
  cerradaPorNombre: string | null;
  /** `null` mientras la caja está abierta. */
  efectivoEsperado: number | null;
  efectivoContado: number | null;
  /** contado − esperado: positivo sobrante, negativo faltante. */
  diferencia: number | null;
  denominaciones: Denominacion[] | null;
  observacionesApertura: string | null;
  observacionesCierre: string | null;
  revisadaPor: string | null;
  revisadaPorNombre: string | null;
  revisadaAt: string | null;
  observacionesRevision: string | null;
};

export type CajaMovimiento = {
  id: string;
  cajaSesionId: string;
  tipo: TipoMovimientoCaja;
  metodoPagoId: string;
  metodoPagoNombre: string | null;
  esEfectivo: boolean;
  monto: number;
  motivo: string;
  referenciaTipo: string | null;
  referenciaId: string | null;
  usuarioId: string;
  anuladoAt: string | null;
  anuladoPor: string | null;
  createdAt: string;
};

export type CajaTotalesMetodo = {
  metodoPagoId: string | null;
  metodoPagoNombre: string;
  esEfectivo: boolean;
  cobros: number;
  cantidadCobros: number;
  ingresos: number;
  retiros: number;
  reembolsos: number;
  egresos: number;
  neto: number;
};

export type CajaEgreso = {
  id: string;
  tipo: "GASTO" | "COMPRA";
  concepto: string;
  metodoPagoId: string | null;
  metodoPagoNombre: string | null;
  esEfectivo: boolean;
  monto: number;
  createdAt: string;
};

export type CajaResumen = {
  sesionId: string;
  /** `true`: calculado ahora; `false`: snapshot guardado al cierre. */
  enVivo: boolean;
  generadoAt: string;
  baseInicial: number;
  efectivo: {
    cobros: number;
    ingresos: number;
    retiros: number;
    reembolsos: number;
    gastos: number;
    compras: number;
    esperado: number;
  };
  porMetodo: CajaTotalesMetodo[];
  cobrosPorOrigen: {
    ventas: number;
    creditos: number;
    reparaciones: number;
    separados: number;
  };
  totales: {
    cobros: number;
    ingresos: number;
    retiros: number;
    reembolsos: number;
    gastos: number;
    compras: number;
  };
  conteos: {
    ventas: number;
    pagos: number;
    abonosSeparado: number;
    anulaciones: number;
    devoluciones: number;
    movimientos: number;
  };
  movimientos: CajaMovimiento[];
  egresos: CajaEgreso[];
};

export type CajaSesionConResumen = { sesion: CajaSesion; resumen: CajaResumen };
export type CajaActual = {
  sesion: CajaSesion | null;
  resumen: CajaResumen | null;
};

export const CAJA_PAGE_SIZE = 20;

export const ESTADO_CAJA_LABEL: Record<string, string> = {
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
  REVISADA: "Revisada",
};

export const ESTADO_CAJA_FILTROS = [
  { value: "", label: "Todas" },
  { value: "ABIERTA", label: "Abiertas" },
  { value: "CERRADA", label: "Cerradas" },
  { value: "REVISADA", label: "Revisadas" },
];

export const DIFERENCIA_FILTROS = [
  { value: "", label: "Cualquier cierre" },
  { value: "true", label: "Con diferencia" },
  { value: "false", label: "Cuadradas" },
];

export const TIPO_MOVIMIENTO_LABEL: Record<string, string> = {
  INGRESO: "Ingreso",
  RETIRO: "Retiro",
  REEMBOLSO: "Reembolso",
};

const num = (v: unknown) => Number(v ?? 0) || 0;
const numOrNull = (v: unknown) => (v == null ? null : num(v));

function mapNums<T extends object>(raw: T | undefined | null): T {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw ?? {})) out[k] = num(v);
  return out as T;
}

/** Los montos pueden llegar como string decimal (`"1500.00"`). */
export function toCajaSesion(raw: CajaSesion): CajaSesion {
  return {
    ...raw,
    baseInicial: num(raw.baseInicial),
    efectivoEsperado: numOrNull(raw.efectivoEsperado),
    efectivoContado: numOrNull(raw.efectivoContado),
    diferencia: numOrNull(raw.diferencia),
    denominaciones: raw.denominaciones
      ? raw.denominaciones.map((d) => ({
          valor: num(d.valor),
          cantidad: num(d.cantidad),
        }))
      : null,
  };
}

export function toCajaMovimiento(raw: CajaMovimiento): CajaMovimiento {
  return { ...raw, monto: num(raw.monto), esEfectivo: raw.esEfectivo === true };
}

export function toCajaResumen(raw: CajaResumen): CajaResumen {
  return {
    ...raw,
    baseInicial: num(raw.baseInicial),
    efectivo: mapNums(raw.efectivo),
    cobrosPorOrigen: mapNums(raw.cobrosPorOrigen),
    totales: mapNums(raw.totales),
    conteos: mapNums(raw.conteos),
    porMetodo: (raw.porMetodo ?? []).map((m) => ({
      ...m,
      metodoPagoNombre: m.metodoPagoNombre || "Sin método",
      esEfectivo: m.esEfectivo === true,
      cobros: num(m.cobros),
      cantidadCobros: num(m.cantidadCobros),
      ingresos: num(m.ingresos),
      retiros: num(m.retiros),
      reembolsos: num(m.reembolsos),
      egresos: num(m.egresos),
      neto: num(m.neto),
    })),
    movimientos: (raw.movimientos ?? []).map(toCajaMovimiento),
    egresos: (raw.egresos ?? []).map((e) => ({ ...e, monto: num(e.monto) })),
  };
}

function toConResumen(raw: CajaSesionConResumen): CajaSesionConResumen {
  return {
    sesion: toCajaSesion(raw.sesion),
    resumen: toCajaResumen(raw.resumen),
  };
}

/** Caja abierta del usuario con su arqueo en vivo; `sesion: null` si no tiene. */
export async function fetchCajaActual(): Promise<CajaActual> {
  const raw = await apiFetch<CajaActual>("caja/sesion-actual");
  if (!raw?.sesion || !raw.resumen) return { sesion: null, resumen: null };
  return toConResumen({ sesion: raw.sesion, resumen: raw.resumen });
}

export type AbrirCajaPayload = {
  baseInicial: number;
  almacenId?: string;
  observaciones?: string;
};

export async function abrirCaja(body: AbrirCajaPayload) {
  return toConResumen(
    await apiFetch<CajaSesionConResumen>("caja/abrir", { method: "POST", body }),
  );
}

export type CrearMovimientoCajaPayload = {
  tipo: TipoMovimientoManual;
  metodoPagoId: string;
  monto: number;
  motivo: string;
};

export async function crearMovimientoCaja(body: CrearMovimientoCajaPayload) {
  return toCajaMovimiento(
    await apiFetch<CajaMovimiento>("caja/movimientos", { method: "POST", body }),
  );
}

export async function anularMovimientoCaja(id: string) {
  return toCajaMovimiento(
    await apiFetch<CajaMovimiento>(`caja/movimientos/${id}`, {
      method: "DELETE",
    }),
  );
}

/** Arqueo de una sesión: en vivo si está abierta, snapshot si ya cerró. */
export async function fetchCajaResumen(id: string) {
  return toConResumen(
    await apiFetch<CajaSesionConResumen>(`caja/sesiones/${id}/resumen`),
  );
}

export type CerrarCajaPayload = {
  efectivoContado: number;
  denominaciones?: Denominacion[];
  observaciones?: string;
};

export async function cerrarCaja(id: string, body: CerrarCajaPayload) {
  return toConResumen(
    await apiFetch<CajaSesionConResumen>(`caja/sesiones/${id}/cerrar`, {
      method: "POST",
      body,
    }),
  );
}

export async function revisarCaja(id: string, observaciones = "") {
  const texto = observaciones.trim();
  return toConResumen(
    await apiFetch<CajaSesionConResumen>(`caja/sesiones/${id}/revisar`, {
      method: "POST",
      body: texto ? { observaciones: texto } : {},
    }),
  );
}

export type CajaSesionesFiltros = {
  estado?: string;
  /** `YYYY-MM-DD` sobre la fecha de apertura. */
  desde?: string;
  hasta?: string;
  /** `"true"`: con sobrante/faltante; `"false"`: cuadradas; vacío: todas. */
  conDiferencia?: string;
};

export async function fetchCajaSesiones(
  filtros: CajaSesionesFiltros = {},
  pagina = 1,
) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(CAJA_PAGE_SIZE),
  });
  for (const key of ["estado", "desde", "hasta", "conDiferencia"] as const) {
    const value = filtros[key];
    if (value) q.set(key, value);
  }
  const data = await apiFetch<{ sesiones: CajaSesion[]; total: number }>(
    `caja/sesiones?${q.toString()}`,
  );
  return {
    sesiones: (data?.sesiones ?? []).map(toCajaSesion),
    total: data?.total ?? 0,
  };
}

/** Nombre y NIT de la empresa activa para el comprobante; `null` si no se pudo leer. */
export async function fetchEmpresaActual(): Promise<{
  nombre: string;
  nit: string | null;
} | null> {
  try {
    const session = await loadSession();
    if (!session?.accessToken) return null;
    const empresas = await fetchEmpresas(session.accessToken);
    const empresa = empresas.find((e) => e.id === session.empresaId);
    return empresa ? { nombre: empresa.nombre, nit: empresa.nit } : null;
  } catch {
    return null;
  }
}

/** Fecha y hora local `dd/mm/aaaa hh:mm` de un ISO; `—` si falta o es inválida. */
export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
