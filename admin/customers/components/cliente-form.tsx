import { Chips, Field, Line } from "@/components/ui/kit";
import type { TipoDocumentoCliente } from "@/core/types";

import { TIPOS_DOCUMENTO, type ClienteFormValues } from "../adapters";

/** Campos del cliente. En edición el documento es de solo lectura. */
export function ClienteForm({
  values,
  onChange,
  editing,
}: {
  values: ClienteFormValues;
  onChange: (patch: Partial<ClienteFormValues>) => void;
  editing: boolean;
}) {
  const isNit = values.tipoDocumento === "NIT";
  const set =
    (k: keyof ClienteFormValues) =>
    (v: string) =>
      onChange({ [k]: v });
  return (
    <>
      {editing ? (
        <Line tone="secondary">{`${values.tipoDocumento} ${values.numeroDocumento}`}</Line>
      ) : (
        <>
          <Chips<TipoDocumentoCliente>
            options={TIPOS_DOCUMENTO}
            value={values.tipoDocumento}
            onChange={(tipoDocumento) => onChange({ tipoDocumento })}
          />
          <Field
            label="Número de documento"
            value={values.numeroDocumento}
            onChange={set("numeroDocumento")}
          />
        </>
      )}
      {isNit ? (
        <Field
          label="Razón social"
          value={values.razonSocial}
          onChange={set("razonSocial")}
        />
      ) : (
        <>
          <Field label="Nombre" value={values.nombre} onChange={set("nombre")} />
          <Field
            label="Apellido"
            value={values.apellido}
            onChange={set("apellido")}
          />
        </>
      )}
      <Field
        label="Teléfono"
        value={values.telefono}
        onChange={set("telefono")}
        keyboardType="phone-pad"
      />
      <Field
        label="Correo electrónico"
        value={values.email}
        onChange={set("email")}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="Dirección"
        value={values.direccion}
        onChange={set("direccion")}
      />
      <Field label="Ciudad" value={values.ciudad} onChange={set("ciudad")} />
    </>
  );
}
