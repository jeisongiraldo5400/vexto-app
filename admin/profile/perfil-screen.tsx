import { useAuth } from "@/admin/auth/hooks/use-auth";
import {
  ActionButton,
  Card,
  Field,
  Heading,
  Line,
  Screen,
  Title,
} from "@/components/ui/kit";
import { canAccess } from "@/core/permissions";
import { useActionRunner } from "@/core/query/use-action-runner";
import { useState } from "react";
import { Alert } from "react-native";

import {
  actualizarPerfil,
  cambiarPassword,
  validatePasswordForm,
  validatePerfil,
  type PasswordForm,
} from "./adapters";

const EMPTY_PASSWORD: PasswordForm = {
  passwordActual: "",
  nuevaPassword: "",
  confirmarPassword: "",
};

export function PerfilScreen() {
  const { user, signOut } = useAuth();
  const { busy, run } = useActionRunner([]);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [pwd, setPwd] = useState<PasswordForm>(EMPTY_PASSWORD);
  const [pwdError, setPwdError] = useState<string | null>(null);
  if (!user) return null;
  const editable = canAccess(user, "core", "usuarios:editar");

  const savePerfil = async () => {
    const err = validatePerfil(fullName, phone);
    setPerfilError(err);
    if (err) return;
    if (await run(() => actualizarPerfil(user.id, fullName, phone)))
      Alert.alert("Perfil actualizado");
  };

  const changePassword = async () => {
    if (await run(() => cambiarPassword(pwd))) {
      setPwd(EMPTY_PASSWORD);
      Alert.alert(
        "Contraseña actualizada",
        "Por seguridad se cerraron tus sesiones. Ingresa con la nueva contraseña.",
      );
      // El backend ya revocó todas las sesiones: solo se limpia el dispositivo.
      void signOut({ revoke: false });
    }
  };

  /** Valida antes de pedir confirmación. */
  const savePassword = () => {
    const err = validatePasswordForm(pwd);
    setPwdError(err);
    if (err) return;
    Alert.alert(
      "Cambiar contraseña",
      "Se cerrarán todas tus sesiones abiertas. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: () => void changePassword(),
        },
      ],
    );
  };

  return (
    <Screen>
      <Title>Mi perfil</Title>
      <Card>
        <Line bold>{user.fullName || "Sin nombre"}</Line>
        <Line tone="secondary">{user.email}</Line>
        {user.rol?.nombre ? <Line tone="secondary">{`Rol: ${user.rol.nombre}`}</Line> : null}
      </Card>

      {editable && (
        <>
          <Heading>Datos personales</Heading>
          <Field label="Nombre completo" value={fullName} onChange={setFullName} />
          <Field
            label="Teléfono (opcional)"
            value={phone}
            onChange={setPhone}
            keyboardType="phone-pad"
          />
          {perfilError ? <Line tone="error">{perfilError}</Line> : null}
          <ActionButton
            label="Guardar datos"
            busy={busy}
            onPress={() => void savePerfil()}
          />
        </>
      )}

      <Heading>Cambiar contraseña</Heading>
      <Field
        label="Contraseña actual"
        value={pwd.passwordActual}
        onChange={(passwordActual) => setPwd((p) => ({ ...p, passwordActual }))}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="Nueva contraseña"
        value={pwd.nuevaPassword}
        onChange={(nuevaPassword) => setPwd((p) => ({ ...p, nuevaPassword }))}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="Confirmar contraseña"
        value={pwd.confirmarPassword}
        onChange={(confirmarPassword) =>
          setPwd((p) => ({ ...p, confirmarPassword }))
        }
        secureTextEntry
        autoCapitalize="none"
      />
      {pwdError ? <Line tone="error">{pwdError}</Line> : null}
      <ActionButton
        label="Cambiar contraseña"
        variant="primary"
        busy={busy}
        onPress={savePassword}
      />
    </Screen>
  );
}
