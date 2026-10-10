import { useEffect } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { apiFetch } from "@/core/http/api";
import { loadSession, saveSession } from "./secure-session";
import type { AuthUser } from "@/core/types";

export function useCapabilitiesSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const empresaId = useAuthStore((s) => s.empresaId);
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId || !empresaId) return;
    let active = true;
    let running = false;
    const refresh = async () => {
      if (running || AppState.currentState !== "active") return;
      running = true;
      try {
        const user = await apiFetch<AuthUser>("auth/profile");
        const session = await loadSession();
        if (
          !active ||
          !session ||
          session.user.id !== userId ||
          session.empresaId !== empresaId ||
          user.empresaId !== empresaId
        )
          return;
        if (
          JSON.stringify([user.permisos, user.modulosHabilitados]) !==
          JSON.stringify([
            session.user.permisos,
            session.user.modulosHabilitados,
          ])
        ) {
          await qc.cancelQueries();
          qc.removeQueries();
          await saveSession({ ...session, user });
          if (active)
            useAuthStore
              .getState()
              .setSession({
                user,
                empresaId,
                needsCompanyPick: session.needsCompanyPick,
              });
        }
      } catch {
        /* La API sigue validando acceso; fallos de red no cierran sesión. */
      } finally {
        running = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [userId, empresaId, qc]);
}
