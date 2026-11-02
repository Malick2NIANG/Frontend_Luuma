import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '@/constants/colors';

export const CODE_LENGTH = 6;

export interface CodeInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Appelé dès que les 6 chiffres sont saisis. */
  onComplete?: (code: string) => void;
  error?: string;
  editable?: boolean;
}

/**
 * Saisie d'un code à 6 chiffres.
 *
 * UN SEUL champ invisible derrière six cases dessinées, plutôt que six champs
 * qui se passent le focus. C'est ce que font les applications bancaires, et
 * pour une bonne raison : avec six champs, le collage du code depuis la boîte
 * mail ne remplit que la première case, et l'effacement se comporte de façon
 * imprévisible selon les claviers Android. Ici, coller fonctionne, effacer
 * fonctionne, et le remplissage automatique du code reçu par SMS aussi.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  error,
  editable = true,
}: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(CODE_LENGTH).split('').slice(0, CODE_LENGTH);
  const focusedIndex = Math.min(value.length, CODE_LENGTH - 1);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange(cleaned);
    if (cleaned.length === CODE_LENGTH) onComplete?.(cleaned);
  };

  return (
    <View className="w-full">
      <Pressable
        onPress={() => inputRef.current?.focus()}
        className="flex-row justify-between"
        accessibilityRole="button"
        accessibilityLabel="Saisir le code à 6 chiffres"
      >
        {digits.map((digit, index) => {
          const filled = digit.trim().length > 0;
          const active = editable && index === focusedIndex;

          return (
            <View
              key={index}
              className={[
                'h-14 w-[46px] items-center justify-center rounded-xl border-2',
                error
                  ? 'border-red-400'
                  : active
                    ? 'border-primary'
                    : filled
                      ? 'border-gray-300'
                      : 'border-gray-200',
              ].join(' ')}
            >
              <Text className="text-[22px] font-bold text-gray-900">
                {digit.trim()}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        editable={editable}
        autoFocus
        // Invisible mais présent dans l'arbre : le masquer par `display:none`
        // empêcherait le clavier de s'ouvrir sur certaines plateformes.
        style={{
          position: 'absolute',
          opacity: 0,
          height: 56,
          width: '100%',
        }}
        caretHidden
        selectionColor={colors.primary}
      />

      {error ? (
        <Text className="mt-2 text-center text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
