export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  roleId: string;
  empresaId?: string;
  permisos?: string[];
  rol?: { id: string; codigo: string; nombre: string };
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type EmpresaDelUsuario = {
  id: string;
  nombre: string;
  nit: string | null;
  activo: boolean;
};

export type Producto = {
  id: string;
  codigo: string;
  codigoBarras: string | null;
  nombre: string;
  precioVenta: number;
  unidadMedidaId: string;
  unidadMedida?: { id: string; nombre: string; abreviatura: string };
  estado: string;
};

export type UnidadMedida = {
  id: string;
  nombre: string;
  abreviatura: string;
  estado: string;
};

export type Almacen = {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
};

export type MetodoPago = {
  id: string;
  nombre: string;
  codigo: string;
  estado: string;
};

export type StockInfo = {
  id: string;
  productoId: string;
  almacenId: string;
  cantidad: number;
  cantidadReservada: number;
  cantidadDisponible: number;
};

export type VentaResponse = {
  id: string;
  numeroFactura: string;
  items: {
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
};
