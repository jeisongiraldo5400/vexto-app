import { Colors } from '@/constants/theme';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

const EXAMPLES = [
  'vendí 8 cervezas a 3500',
  'se fueron 3 arroz',
  'registrar venta de 2 hamburguesas a 15000'
];

type Props = {
  c: (typeof Colors)[keyof typeof Colors];
  keyboardOpen: boolean;
  onExample: (text: string) => void;
};

export function ChatEmptyState ({ c, keyboardOpen, onExample }: Props) {
  return (
    <Pressable style={styles.listContainer} onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.emptyState, keyboardOpen && styles.emptyStateKeyboardOpen]}>
        <Text style={[styles.emptyTitle, { color: c.text }]}>
          ¡Hola! 👋
        </Text>
        <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
          Escribe algo como:
        </Text>
        <View style={styles.examples}>
          {EXAMPLES.map((ex) => (
            <Pressable
              key={ex}
              style={({ pressed }) => [
                styles.exampleChip,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => onExample(ex)}>
              <Text style={[styles.exampleText, { color: c.text }]}>
                {`"${ex}"`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 12,
  },
  emptyStateKeyboardOpen: {
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingBottom: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  examples: {
    marginTop: 8,
    gap: 8,
    width: '100%',
  },
  exampleChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exampleText: {
    fontSize: 14,
  },
});
