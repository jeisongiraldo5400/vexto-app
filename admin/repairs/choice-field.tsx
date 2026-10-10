import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function ChoiceField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const c = Colors[useColorScheme() ?? "light"];
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: c.text }}>
          {label}:{" "}
          {options.find((o) => o.id === value)?.nombre ?? "Seleccionar"}
        </Text>
      </Pressable>
      <Modal
        visible={open}
        onRequestClose={() => setOpen(false)}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: c.background,
            padding: 24,
            paddingTop: 50,
            gap: 12,
          }}
        >
          <Text style={{ color: c.text, fontSize: 20 }}>{label}</Text>
          <TextInput
            placeholder="Buscar"
            placeholderTextColor={c.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{
              color: c.text,
              borderWidth: 1,
              borderColor: c.cardBorder,
              padding: 12,
            }}
          />
          <ScrollView>
            {options
              .filter((o) =>
                o.nombre.toLowerCase().includes(search.toLowerCase()),
              )
              .map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  style={{ padding: 16 }}
                >
                  <Text style={{ color: c.text }}>{o.nombre}</Text>
                </Pressable>
              ))}
          </ScrollView>
          <Pressable onPress={() => setOpen(false)}>
            <Text style={{ color: c.tint, padding: 16 }}>Cerrar</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
