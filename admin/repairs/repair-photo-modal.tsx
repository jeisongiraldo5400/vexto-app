import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  tint: string;
  onClose: () => void;
  onCapture: (payload: { base64: string; uri: string }) => void;
};

export function RepairPhotoModal({ visible, tint, onClose, onCapture }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  const take = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.3,
        base64: true,
      });
      if (photo?.uri && photo.base64) {
        onCapture({ base64: photo.base64, uri: photo.uri });
        onClose();
      }
    } catch (e) {
      Alert.alert(
        "No se pudo tomar la foto",
        e instanceof Error ? e.message : "Intenta nuevamente",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {Platform.OS !== "web" && permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.text}>
              {Platform.OS === "web"
                ? "La cámara no está disponible en web."
                : "Necesitamos permiso de cámara para evidencias."}
            </Text>
            {Platform.OS !== "web" ? (
              <Pressable
                style={[styles.btn, { backgroundColor: tint }]}
                onPress={() => void requestPermission()}
              >
                <Text style={styles.btnText}>Permitir cámara</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        <View style={styles.bar}>
          {Platform.OS !== "web" && permission?.granted ? (
            <Pressable
              style={[styles.btn, { backgroundColor: tint }]}
              onPress={() => void take()}
            >
              <Text style={styles.btnText}>
                {busy ? "Guardando…" : "Tomar foto"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.btnText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: { color: "#fff", textAlign: "center", fontSize: 16 },
  bar: { position: "absolute", bottom: 32, left: 16, right: 16, gap: 10 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  close: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
