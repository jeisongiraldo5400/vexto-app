/** Datos de prueba de caja con la forma del contrato (`docs/CAJA-API.md` del backend). */
export const sesionAbierta = {
  id: 's1',
  usuarioId: 'u1',
  usuarioNombre: 'Ana Pérez',
  sucursalId: 'suc1',
  sucursalNombre: 'Centro',
  almacenId: 'a1',
  almacenNombre: 'Principal',
  baseInicial: '100000.00',
  estado: 'ABIERTA',
  abiertaAt: '2026-11-12T13:00:00.000Z',
  cerradaAt: null,
  cerradaPor: null,
  cerradaPorNombre: null,
  efectivoEsperado: null,
  efectivoContado: null,
  diferencia: null,
  denominaciones: null,
  observacionesApertura: 'Turno mañana',
  observacionesCierre: null,
  revisadaPor: null,
  revisadaPorNombre: null,
  revisadaAt: null,
  observacionesRevision: null,
};

export const sesionCerrada = {
  ...sesionAbierta,
  id: 's9',
  estado: 'CERRADA',
  cerradaAt: '2026-11-12T22:00:00.000Z',
  cerradaPor: 'u1',
  cerradaPorNombre: 'Ana Pérez',
  efectivoEsperado: 520000,
  efectivoContado: 500000,
  diferencia: -20000,
  denominaciones: [
    { valor: 100000, cantidad: 4 },
    { valor: 50000, cantidad: 2 },
  ],
  observacionesCierre: 'Faltó un billete <de 20>',
};

const movimiento = (extra: Record<string, unknown>) => ({
  id: 'm1',
  cajaSesionId: 's1',
  tipo: 'INGRESO',
  metodoPagoId: 'cash',
  metodoPagoNombre: 'Efectivo',
  esEfectivo: true,
  monto: 10000,
  motivo: 'Cambio de la vecina',
  referenciaTipo: null,
  referenciaId: null,
  usuarioId: 'u1',
  anuladoAt: null,
  anuladoPor: null,
  createdAt: '2026-11-12T14:00:00.000Z',
  ...extra,
});

export const resumen = {
  sesionId: 's1',
  enVivo: true,
  generadoAt: '2026-11-12T15:00:00.000Z',
  baseInicial: 100000,
  efectivo: { cobros: 440000, ingresos: 10000, retiros: 30000, reembolsos: 0, gastos: 0, compras: 0, esperado: 520000 },
  porMetodo: [
    { metodoPagoId: 'cash', metodoPagoNombre: 'Efectivo', esEfectivo: true, cobros: 440000, cantidadCobros: 5, ingresos: 10000, retiros: 30000, reembolsos: 0, egresos: 0, neto: 420000 },
    { metodoPagoId: 'nequi', metodoPagoNombre: 'Nequi', esEfectivo: false, cobros: 80000, cantidadCobros: 1, ingresos: 0, retiros: 0, reembolsos: 0, egresos: 0, neto: 80000 },
  ],
  cobrosPorOrigen: { ventas: 430000, creditos: 20000, reparaciones: 0, separados: 70000 },
  totales: { cobros: 520000, ingresos: 10000, retiros: 30000, reembolsos: 0, gastos: 0, compras: 0 },
  conteos: { ventas: 4, pagos: 6, abonosSeparado: 2, anulaciones: 0, devoluciones: 0, movimientos: 2 },
  movimientos: [
    movimiento({}),
    movimiento({ id: 'm2', tipo: 'RETIRO', monto: 30000, motivo: 'Consignación', usuarioId: 'u2' }),
    movimiento({ id: 'm3', tipo: 'REEMBOLSO', monto: 5000, motivo: 'Devolución DEV-1', referenciaTipo: 'DEVOLUCION', referenciaId: 'd1' }),
    movimiento({ id: 'm4', monto: 7000, motivo: 'Error de digitación', anuladoAt: '2026-11-12T14:30:00.000Z', anuladoPor: 'u1' }),
  ],
  egresos: [
    { id: 'g1', tipo: 'GASTO', concepto: 'Papelería', metodoPagoId: 'cash', metodoPagoNombre: 'Efectivo', esEfectivo: true, monto: 15000, createdAt: '2026-11-12T16:00:00.000Z' },
  ],
};

export const metodosPago = [
  { id: 'cash', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo', esEfectivo: true },
  { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo', esEfectivo: false },
  { id: 'cred', nombre: 'Crédito', codigo: 'credito', estado: 'activo', esEfectivo: false },
  { id: 'sep', nombre: 'Separado', codigo: 'separado', estado: 'activo', esEfectivo: false },
  { id: 'old', nombre: 'Cheque', codigo: 'cheque', estado: 'inactivo', esEfectivo: false },
];

export const CAJA_TODOS = ['caja:ver', 'caja:abrir', 'caja:cerrar', 'caja:movimientos', 'caja:aprobar'];
