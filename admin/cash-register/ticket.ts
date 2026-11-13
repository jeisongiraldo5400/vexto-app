import { formatCurrency } from "@/core/format";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  ESTADO_CAJA_LABEL,
  fetchEmpresaActual,
  formatFechaHora,
  type CajaResumen,
  type CajaSesion,
} from "./adapters";
import { etiquetaDiferencia } from "./cierre";

export type TicketCajaData = {
  empresa?: { nombre: string; nit?: string | null } | null;
  sesion: CajaSesion;
  resumen: CajaResumen;
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const row = (label: string, value: string, bold = false) =>
  `<tr${bold ? ' class="b"' : ""}><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;

const section = (title: string, rows: string[]) =>
  rows.length
    ? `<h2>${esc(title)}</h2><table>${rows.join("")}</table>`
    : "";

/** Comprobante de cierre de caja (HTML de 80 mm para imprimir o exportar a PDF). */
export function buildTicketCajaHtml({
  empresa,
  sesion: s,
  resumen: r,
}: TicketCajaData): string {
  const money = (n: number) => formatCurrency(n);
  const e = r.efectivo;
  const cerrada = s.estado !== "ABIERTA";
  const esperado = s.efectivoEsperado ?? e.esperado;

  const cabecera = [
    row("Cajero", s.usuarioNombre ?? "—"),
    row("Estado", ESTADO_CAJA_LABEL[s.estado] ?? s.estado),
    ...(s.sucursalNombre ? [row("Sucursal", s.sucursalNombre)] : []),
    ...(s.almacenNombre ? [row("Almacén", s.almacenNombre)] : []),
    row("Apertura", formatFechaHora(s.abiertaAt)),
    row("Cierre", cerrada ? formatFechaHora(s.cerradaAt) : "Caja abierta"),
    ...(s.cerradaPor && s.cerradaPor !== s.usuarioId
      ? [row("Cerrada por", s.cerradaPorNombre ?? "Otro usuario")]
      : []),
  ];

  const efectivo = [
    row("Base inicial", money(r.baseInicial)),
    row("+ Cobros en efectivo", money(e.cobros)),
    row("+ Ingresos", money(e.ingresos)),
    row("− Retiros", money(e.retiros)),
    row("− Reembolsos", money(e.reembolsos)),
    row("− Gastos", money(e.gastos)),
    ...(e.compras ? [row("− Compras", money(e.compras))] : []),
    row("Efectivo esperado", money(esperado), true),
    ...(s.efectivoContado != null
      ? [row("Efectivo contado", money(s.efectivoContado), true)]
      : []),
    ...(s.diferencia != null
      ? [row("Diferencia", etiquetaDiferencia(s.diferencia), true)]
      : []),
  ];

  const metodos = r.porMetodo.flatMap((m) => [
    row(
      `${m.metodoPagoNombre} (${m.cantidadCobros})`,
      money(m.cobros),
      true,
    ),
    ...(m.ingresos || m.retiros || m.reembolsos || m.egresos
      ? [
          row(
            "  Ing. / Ret. / Reemb. / Egr.",
            `${money(m.ingresos)} / ${money(m.retiros)} / ${money(m.reembolsos)} / ${money(m.egresos)}`,
          ),
        ]
      : []),
    row("  Neto", money(m.neto)),
  ]);

  const origen = [
    row("Ventas", money(r.cobrosPorOrigen.ventas)),
    row("Abonos a crédito", money(r.cobrosPorOrigen.creditos)),
    row("Reparaciones", money(r.cobrosPorOrigen.reparaciones)),
    row("Separados", money(r.cobrosPorOrigen.separados)),
    row("Total cobrado", money(r.totales.cobros), true),
  ];

  const conteos = [
    row("Ventas", String(r.conteos.ventas)),
    row("Pagos", String(r.conteos.pagos)),
    row("Abonos de separado", String(r.conteos.abonosSeparado)),
    row("Anulaciones", String(r.conteos.anulaciones)),
    row("Devoluciones", String(r.conteos.devoluciones)),
    row("Movimientos de caja", String(r.conteos.movimientos)),
  ];

  const denominaciones = (s.denominaciones ?? [])
    .filter((d) => d.cantidad > 0)
    .map((d) =>
      row(`${money(d.valor)} × ${d.cantidad}`, money(d.valor * d.cantidad)),
    );

  const nota = (titulo: string, texto: string | null) =>
    texto ? `<h2>${esc(titulo)}</h2><p>${esc(texto)}</p>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Cierre de caja</title>
<style>
  @page { margin: 8mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #000; max-width: 80mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
  h2 { font-size: 12px; text-transform: uppercase; border-top: 1px dashed #000; padding-top: 6px; margin: 10px 0 4px; }
  p { margin: 2px 0; }
  .c { text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  td.r { text-align: right; white-space: nowrap; padding-left: 8px; }
  tr.b td { font-weight: 700; }
  .firma { margin-top: 28px; border-top: 1px solid #000; padding-top: 4px; text-align: center; }
</style>
</head>
<body>
  <h1>${esc(empresa?.nombre || "Cierre de caja")}</h1>
  ${empresa?.nit ? `<p class="c">NIT ${esc(empresa.nit)}</p>` : ""}
  <p class="c"><strong>${cerrada ? "Comprobante de cierre de caja" : "Arqueo parcial de caja"}</strong></p>
  <table>${cabecera.join("")}</table>
  ${section("Efectivo", efectivo)}
  ${section("Totales por método", metodos)}
  ${section("Cobros por origen", origen)}
  ${section("Operaciones", conteos)}
  ${section("Denominaciones contadas", denominaciones)}
  ${nota("Observaciones de apertura", s.observacionesApertura)}
  ${nota("Observaciones de cierre", s.observacionesCierre)}
  ${
    s.estado === "REVISADA"
      ? nota(
          "Revisión",
          `Revisada por ${s.revisadaPorNombre ?? "—"} el ${formatFechaHora(s.revisadaAt)}${s.observacionesRevision ? `. ${s.observacionesRevision}` : ""}`,
        )
      : ""
  }
  <p class="firma">Firma del cajero</p>
  <p class="c">Generado ${esc(formatFechaHora(new Date().toISOString()))}</p>
</body>
</html>`;
}

async function htmlDe(data: TicketCajaData) {
  const empresa =
    data.empresa === undefined ? await fetchEmpresaActual() : data.empresa;
  return buildTicketCajaHtml({ ...data, empresa });
}

/** Genera el PDF del comprobante y abre la hoja de compartir (o imprime si no hay). */
export async function compartirTicketCaja(data: TicketCajaData) {
  const html = await htmlDe(data);
  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Cierre de caja",
  });
}

/** Abre el diálogo de impresión. Cerrar el diálogo sin imprimir no es un error. */
export async function imprimirTicketCaja(data: TicketCajaData) {
  const html = await htmlDe(data);
  try {
    await Print.printAsync({ html });
  } catch (e) {
    if (e instanceof Error && /did not complete|cancel/i.test(e.message)) return;
    throw e;
  }
}
