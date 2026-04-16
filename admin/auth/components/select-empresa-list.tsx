import { useAuth } from '@/admin/auth/hooks/use-auth';
import { useEmpresasUsuarioQuery } from '@/admin/auth/hooks/use-empresas-usuario-query';
import { BrandGradient, cardElevationShadow, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

export function SelectEmpresaList() {
  const { completeCompanySelection } = useAuth();
  const { data, isLoading, isError } = useEmpresasUsuarioQuery();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const list = (data ?? []).filter((r) => r.activo);

  async function onPick(id: string) {
    setSavingId(id);
    setErr(null);
    try {
      await completeCompanySelection(id);
    } catch {
      setErr('No se pudo cambiar de empresa. Intenta de nuevo.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[...BrandGradient.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
        <Text style={styles.headerTitle}>¿En cuál empresa vendes?</Text>
        <Text style={styles.headerSub}>Toca una opción para continuar</Text>
      </LinearGradient>

      <View
        style={[
          styles.body,
          { backgroundColor: c.background, paddingHorizontal: 20, paddingBottom: insets.bottom + 16 },
        ]}>
        {isLoading ? (
          <ActivityIndicator size="large" color={c.tint} style={{ marginTop: 32 }} />
        ) : null}
        {isError ? (
          <Text style={[styles.err, { color: c.error }]}>No pudimos cargar las empresas.</Text>
        ) : null}

        {!isLoading && !isError ? (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: 16, gap: 12, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const selected = savingId === item.id;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: c.card,
                      borderColor: pressed || selected ? c.tint : c.cardBorder,
                      borderWidth: pressed || selected ? 2 : 1,
                    },
                    cardElevationShadow(),
                  ]}
                  onPress={() => onPick(item.id)}
                  disabled={savingId !== null}>
                  {selected ? (
                    <ActivityIndicator color={c.tint} />
                  ) : (
                    <>
                      <Text style={[styles.cardTitle, { color: c.text }]}>{item.nombre}</Text>
                      {item.nit ? (
                        <Text style={[styles.cardSub, { color: c.textSecondary }]}>NIT {item.nit}</Text>
                      ) : null}
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        ) : null}
        {err ? <Text style={[styles.err, { color: c.error }]}>{err}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 21,
  },
  body: {
    flex: 1,
    marginTop: -12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 14,
    padding: 20,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  cardSub: {
    marginTop: 6,
    fontSize: 15,
  },
  err: {
    marginTop: 16,
    fontSize: 16,
  },
});
