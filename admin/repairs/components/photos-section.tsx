import type { PhotoState } from "@/admin/repairs/hooks";
import { Image, Pressable, Switch, Text, View } from "react-native";
import {
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

/** Evidencias: captura (con visibilidad) y visualización de fotos. */
export function PhotosSection({
  order: o,
  closed,
  photos,
}: Omit<SectionProps, "resources"> & { photos: PhotoState }) {
  const { c, can, busy } = useRepairDetailCtx();
  return (
    <>
      <RHeading>Evidencias</RHeading>
      {can("reparaciones:editar") && !closed && (
        <>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <RText>Publicar foto para cliente</RText>
            <Switch
              value={photos.publicPhoto}
              onValueChange={photos.setPublicPhoto}
            />
          </View>
          <Pressable disabled={busy} onPress={() => photos.setCamera(true)}>
            <RText>Tomar foto</RText>
          </Pressable>
        </>
      )}
      {(o.fotos ?? []).map((f) => (
        <View key={f.id}>
          {/* Lectura: no pasa por run() para no invalidar queries. */}
          <Pressable
            accessibilityRole="button"
            disabled={photos.photoLoading !== null}
            onPress={() => photos.viewPhoto(f.id)}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: c.tint,
              borderRadius: 8,
              opacity: photos.photoLoading !== null ? 0.5 : 1,
            }}
          >
            <Text style={{ color: c.tint, fontWeight: "600" }}>
              {photos.photoLoading === f.id
                ? "Cargando foto…"
                : "Ver foto · " + f.visibility}
            </Text>
          </Pressable>
        </View>
      ))}
      {photos.image && (
        <Image
          source={{ uri: photos.image }}
          style={{ height: 300, resizeMode: "contain" }}
        />
      )}
    </>
  );
}
