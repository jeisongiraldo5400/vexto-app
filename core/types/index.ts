export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  roleId: string;
  empresaId?: string;
  permisos?: string[];
  rol?: { id: string; codigo: string; nombre: string };
  modulosHabilitados?: string[];
  sucursalIds?: string[];
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
  chatVentasHabilitado: boolean;
  modulosHabilitados?: string[];
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

/** Respuesta de listado / creación de clientes (subset útil para POS). */
export type Cliente = {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  apellido: string | null;
  razonSocial: string | null;
  telefono: string | null;
  email?: string | null;
};

export type TipoDocumentoCliente = 'CC' | 'NIT' | 'CE' | 'TI' | 'PASAPORTE';

export type CrearClientePayload = {
  tipoDocumento: TipoDocumentoCliente;
  numeroDocumento: string;
  nombre: string;
  email?: string;
  apellido?: string;
  razonSocial?: string;
  telefono?: string;
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
  total: number;
};

/* ─── Chat Ventas NLP ─── */
export type ChatVentaStatus =
  | 'success'
  | 'ambiguous'
  | 'not_found'
  | 'needs_price'
  | 'needs_price_confirmation'
  | 'insufficient_stock'
  | 'clarification'
  | 'invalid_input';

export type ChatVentaOption = {
  id: string;
  nombre: string;
  precioVenta: number;
  stockDisponible: number;
};

export type ChatVentaResponse = {
  status: ChatVentaStatus;
  mensaje: string;
  venta?: VentaResponse;
  opciones?: ChatVentaOption[];
  intencionPendiente?: {
    nombreProducto: string;
    cantidad: number;
    precioUnitario?: number;
  };
  // Campos para confirmación de precio
  precioSugerido?: number;
  precioRegistrado?: number;
  precioMinimoPermitido?: number;
};

export type ChatVentaRequest = {
  mensaje: string;
  sessionId: string;
  contexto?: {
    productoDisambiguar?: string;
    confirmarPrecio?: boolean; // true = usar precio sugerido, false = usar registrado
    ultimaIntencion?: {
      nombreProducto?: string;
      cantidad?: number;
      precioUnitario?: number;
    };
  };
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  action?:
    | {
        type: 'disambiguation';
        options: ChatVentaOption[];
        intencionPendiente: {
          nombreProducto: string;
          cantidad: number;
          precioUnitario?: number;
        };
      }
    | {
        type: 'price_confirmation';
        precioSugerido: number;
        precioRegistrado: number;
        precioMinimoPermitido: number;
        bloqueado: boolean; // true = por debajo del mínimo (solo puede usar registrado)
        intencionPendiente: {
          nombreProducto: string;
          cantidad: number;
          precioUnitario?: number;
        };
      }
    | {
        type: 'success';
        venta: VentaResponse;
      };
};
