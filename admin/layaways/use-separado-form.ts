import { newIdempotencyIntent } from "@/core/http/idempotent";
import type { Cliente, Producto } from "@/core/types";
import { parseCantidad, parseMonto } from "@/core/utils/money";
import { useRef, useState } from "react";

import {
  crearSeparado,
  esFechaRetiroValida,
  fechaRetiroPorDefecto,
} from "./adapters";

export type SeparadoLinea = {
  productoId: string;
  nombre: string;
  precio: number;
  /** Texto crudo del campo de cantidad. */
  cantidad: string;
};

/** Estado y validación del formulario de nuevo separado (sin IVA). */
export function useSeparadoForm() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [almacenId, setAlmacenId] = useState("");
  const [lineas, setLineas] = useState<SeparadoLinea[]>([]);
  const [anticipo, setAnticipo] = useState("");
  const [fecha, setFecha] = useState(() => fechaRetiroPorDefecto());
  /** Una intención por separado: se conserva en reintentos y se renueva tras el éxito. */
  const intent = useRef<string | null>(null);

  const addProducto = (p: Producto) =>
    setLineas((ls) =>
      ls.some((l) => l.productoId === p.id)
        ? ls.map((l) =>
            l.productoId === p.id
              ? { ...l, cantidad: String((parseCantidad(l.cantidad) || 0) + 1) }
              : l,
          )
        : [
            ...ls,
            {
              productoId: p.id,
              nombre: p.nombre,
              precio: Number(p.precioVenta) || 0,
              cantidad: "1",
            },
          ],
    );
  const setCantidad = (productoId: string, cantidad: string) =>
    setLineas((ls) =>
      ls.map((l) => (l.productoId === productoId ? { ...l, cantidad } : l)),
    );
  const removeLinea = (productoId: string) =>
    setLineas((ls) => ls.filter((l) => l.productoId !== productoId));

  const total =
    Math.round(
      lineas.reduce(
        (acc, l) => acc + l.precio * (parseCantidad(l.cantidad) || 0),
        0,
      ) * 100,
    ) / 100;
  const anticipoNum = anticipo.trim() === "" ? 0 : parseMonto(anticipo);

  const error = !cliente
    ? "Selecciona un cliente."
    : !almacenId
      ? "Selecciona un almacén."
      : lineas.length === 0
        ? "Agrega al menos un producto."
        : lineas.some((l) => !(parseCantidad(l.cantidad) >= 1))
          ? "Cada producto necesita una cantidad entera mayor a 0."
          : !Number.isFinite(anticipoNum) || anticipoNum < 0
            ? "Anticipo inválido."
            : anticipoNum > total
              ? "El anticipo no puede superar el total."
              : !esFechaRetiroValida(fecha)
                ? "La fecha límite debe ser posterior a hoy (AAAA-MM-DD)."
                : null;

  const submit = async () => {
    if (error || !cliente) throw new Error(error ?? "Formulario inválido");
    intent.current ??= newIdempotencyIntent();
    const created = await crearSeparado(
      {
        clienteId: cliente.id,
        almacenId,
        items: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: parseCantidad(l.cantidad),
        })),
        anticipo: anticipoNum,
        fechaLimiteRetiro: fecha,
      },
      intent.current,
    );
    intent.current = null;
    return created;
  };

  return {
    cliente,
    setCliente,
    almacenId,
    setAlmacenId,
    lineas,
    addProducto,
    setCantidad,
    removeLinea,
    anticipo,
    setAnticipo,
    anticipoNum,
    fecha,
    setFecha,
    total,
    error,
    submit,
  };
}
export type SeparadoForm = ReturnType<typeof useSeparadoForm>;
