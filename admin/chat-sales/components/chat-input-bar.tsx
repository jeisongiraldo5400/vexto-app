import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInputBar({ onSend, disabled }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.backgroundPaper,
          borderTopColor: c.border,
        },
      ]}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: c.inputBackground ?? c.card,
            borderColor: c.border,
          },
        ]}>
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="Ej: vendí 3 cervezas a 3500"
          placeholderTextColor={c.textMuted ?? c.textSecondary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline={false}
          editable={!disabled}
        />
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.sendBtn,
          {
            backgroundColor: c.tint,
            opacity: disabled || !text.trim() || pressed ? 0.6 : 1,
          },
        ]}
        onPress={handleSend}
        disabled={disabled || !text.trim()}>
        <MaterialIcons name="send" size={20} color={c.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
