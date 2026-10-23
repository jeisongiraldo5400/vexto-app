import { Colors } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  c: (typeof Colors)[keyof typeof Colors];
  showClear: boolean;
  onClear: () => void;
};

export function ChatHeader ({ c, showClear, onClear }: Props) {
  return (
    <View style={[styles.header, { backgroundColor: c.backgroundPaper, borderBottomColor: c.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Venta por Chat</Text>
        <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
          Escribe lo que vendiste en lenguaje natural
        </Text>
      </View>
      {showClear && (
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={{ color: c.error, fontSize: 13, fontWeight: '600' }}>
            Limpiar
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
