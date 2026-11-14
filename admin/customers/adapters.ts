import { apiFetch } from "@/core/http/api";
import type { Cliente, TipoDocumentoCliente } from "@/core/types";

export type ClienteDetalle = Cliente & {
  direccion?: string | null;
  ciudad?: string | null;
  activo?: boolean;
};

export type ClientesPage = { clientes: ClienteDetalle[]; total: number };

export const CLIENTES_PAGE_SIZE = 20;

export const TIPOS_DOCUMENTO: { value: TipoDocumentoCliente; label: string }[] =
  [
    { value: "CC", label: "CC" },
    { value: "NIT", label: "NIT" },
    { value: "CE", label: "CE" },
    { value: "TI", label: "TI" },
    { value: "PASAPORTE", label: "Pasaporte" },
  ];

/** Nombre visible: razón social, nombre + apellido o documento. */
export function nombreCliente(
  c: Partial<
    Pick<Cliente, "nombre" | "apellido" | "razonSocial" | "numeroDocumento">
  >,
): string {
  return (
    c.razonSocial?.trim() ||
    [c.nombre, c.apellido].filter((s) => s?.trim()).join(" ") ||
    c.numeroDocumento ||
    "Sin nombre"
  );
}

export function fetchClientes(busqueda: string, pagina = 1) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(CLIENTES_PAGE_SIZE),
    activo: "true",
  });
  if (busqueda.trim()) q.set("busqueda", busqueda.trim());
  return apiFetch<ClientesPage>(`clientes?${q.toString()}`);
}

export function fetchCliente(id: string) {
  return apiFetch<ClienteDetalle>(`clientes/${id}`);
}

export type ClienteFormValues = {
  tipoDocumento: TipoDocumentoCliente;
  numeroDocumento: string;
  nombre: string;
  apellido: string;
  razonSocial: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
};

export const EMPTY_CLIENTE_FORM: ClienteFormValues = {
  tipoDocumento: "CC",
  numeroDocumento: "",
  nombre: "",
  apellido: "",
  razonSocial: "",
  telefono: "",
  email: "",
  direccion: "",
  ciudad: "",
};

export function toClienteForm(c: ClienteDetalle): ClienteFormValues {
  return {
    tipoDocumento: (c.tipoDocumento as TipoDocumentoCliente) ?? "CC",
    numeroDocumento: c.numeroDocumento ?? "",
    nombre: c.nombre ?? "",
    apellido: c.apellido ?? "",
    razonSocial: c.razonSocial ?? "",
    telefono: c.telefono ?? "",
    email: c.email ?? "",
    direccion: c.direccion ?? "",
    ciudad: c.ciudad ?? "",
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s()]*$/;

/** Devuelve el primer error del formulario o `null` si es válido. */
export function validateClienteForm(v: ClienteFormValues): string | null {
  if (!v.numeroDocumento.trim()) return "Indica el número de documento.";
  if (v.tipoDocumento === "NIT") {
    if (!v.razonSocial.trim()) return "La razón social es obligatoria para NIT.";
  } else if (!v.nombre.trim()) return "El nombre es obligatorio.";
  if (v.email.trim() && !EMAIL.test(v.email.trim())) return "Correo inválido.";
  if (!PHONE.test(v.telefono.trim())) return "Teléfono inválido.";
  return null;
}

const opt = (s: string) => (s.trim() ? s.trim() : undefined);

export function crearCliente(v: ClienteFormValues) {
  const isNit = v.tipoDocumento === "NIT";
  const body = {
    tipoDocumento: v.tipoDocumento,
    numeroDocumento: v.numeroDocumento.trim(),
    nombre: isNit ? v.razonSocial.trim() : v.nombre.trim(),
    apellido: opt(v.apellido),
    razonSocial: opt(v.razonSocial),
    telefono: opt(v.telefono),
    email: opt(v.email),
    direccion: opt(v.direccion),
    ciudad: opt(v.ciudad),
  };
  return apiFetch<ClienteDetalle>("clientes", { method: "POST", body });
}

/** Tipo y número de documento no se editan; un campo vacío se limpia con `null`. */
export function actualizarCliente(id: string, v: ClienteFormValues) {
  const isNit = v.tipoDocumento === "NIT";
  const clear = (s: string) => (s.trim() ? s.trim() : null);
  const body = {
    nombre: isNit ? v.razonSocial.trim() : v.nombre.trim(),
    apellido: clear(v.apellido),
    razonSocial: clear(v.razonSocial),
    telefono: clear(v.telefono),
    email: clear(v.email),
    direccion: clear(v.direccion),
    ciudad: clear(v.ciudad),
  };
  return apiFetch<ClienteDetalle>(`clientes/${id}`, { method: "PUT", body });
}
