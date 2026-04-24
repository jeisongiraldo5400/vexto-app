import { useAuth } from '@/admin/auth/hooks/use-auth';
import { Brand, BrandGradient, cardElevationShadow, Colors, primaryGlowShadow } from '@/constants/theme';
import { ApiError } from '@/core/http/api';
import { getApiBaseUrl } from '@/core/config';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logoVexto = require('../../../assets/logo/vexto.png') as number;

const appVersion = Constants.expoConfig?.version?.trim() || '';

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Escribe correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo entrar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screenRoot, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[...BrandGradient.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20, paddingBottom: 52 }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={[styles.logoTile, primaryGlowShadow()]}>
          <Image
            source={logoVexto}
            style={styles.logoImage}
            resizeMode="cover"
            accessibilityLabel="Vexto"
          />
        </View>
        <Text style={styles.heroTitle}>Vexto</Text>
        <Text style={styles.heroSubtitle}>Inventario y ventas para tu negocio</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20, paddingHorizontal: 20 },
          ]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.backgroundPaper,
                borderColor: c.cardBorder,
              },
              cardElevationShadow(),
            ]}>
            <Text style={[styles.cardHeading, { color: c.text }]}>Iniciar sesión</Text>
            <Text style={[styles.cardSub, { color: c.textSecondary }]}>
              Ingresa tus credenciales para acceder al punto de venta
            </Text>

            <Text style={[styles.label, { color: c.text }]}>Correo electrónico</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.inputBackground,
                  borderColor: c.inputBorder,
                  color: c.text,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={c.textMuted}
            />

            <View style={styles.passwordRow}>
              <Text style={[styles.label, { color: c.text, marginBottom: 0 }]}>Contraseña</Text>
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Text style={[styles.togglePwd, { color: c.tint }]}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </Pressable>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.inputBackground,
                  borderColor: c.inputBorder,
                  color: c.text,
                },
              ]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={c.textMuted}
            />

            {error ? (
              <Text style={[styles.error, { color: c.error }]} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: Brand.primary, opacity: pressed || loading ? 0.88 : 1 },
                primaryGlowShadow(),
              ]}
              onPress={onSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </Pressable>

            <Text style={[styles.apiHint, { color: c.textMuted }]} numberOfLines={2} selectable>
              Servidor: {getApiBaseUrl()}
            </Text>

            <Link href="/" asChild>
              <Pressable style={styles.linkWrap}>
                <Text style={[styles.link, { color: c.tint }]}>Volver al inicio</Text>
              </Pressable>
            </Link>

            {appVersion ? (
              <Text style={[styles.versionLine, { color: c.textMuted }]} accessibilityLabel={`Versión ${appVersion}`}>
                Versión {appVersion}
              </Text>
            ) : null}

            <Text style={[styles.footer, { color: c.textMuted }]}>© {new Date().getFullYear()} Vexto</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecor1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    top: -70,
    right: -60,
  },
  heroDecor2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    bottom: -40,
    left: -36,
  },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
  },
  keyboard: {
    flex: 1,
    marginTop: -40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  togglePwd: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 16,
    borderWidth: 1,
  },
  error: {
    fontSize: 15,
    marginBottom: 12,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  apiHint: {
    fontSize: 11,
    marginTop: 16,
    textAlign: 'center',
  },
  linkWrap: {
    marginTop: 18,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
  versionLine: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
  },
});
