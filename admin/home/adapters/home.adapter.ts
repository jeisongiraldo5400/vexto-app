import { apiFetch } from '@/core/http/api';

export type VentasPorPeriodoData = {
  fecha: string;
  totalVentas: number;
  montoTotal: number;
  cantidadProductos: number;
};

export type ProductosMasVendidosData = {
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  cantidadVendida: number;
  montoTotal: number;
};

export type DashboardData = {
  ventasHoy: number;
  ventasSemana: number;
  ventasMes: number;
  pagosHoy: number;
  productosBajoStock: number;
  totalClientes: number;
  ventasPorPeriodo: VentasPorPeriodoData[];
  productosMasVendidos: ProductosMasVendidosData[];
};

export function fetchDashboard() {
  return apiFetch<DashboardData>('/reportes/dashboard');
}
