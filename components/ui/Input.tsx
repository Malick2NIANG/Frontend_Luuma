import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

/**
 * Champ de saisie.
 *
 * Quand `secureTextEntry` est demandé, le champ porte lui-même son œil de
 * révélation — plutôt qu'un composant `PasswordInput` séparé. Chaque écran qui
 * l'aurait oublié aurait laissé l'utilisateur taper à l'aveugle : c'est la
 * première cause d'échec de connexion sur mobile, où le clavier bascule entre
 * majuscules, chiffres et symboles sans qu'on puisse vérifier.
 */
export function Input({ label, error, className, ...textInputProps }: InputProps) {
  const isPassword = textInputProps.secureTextEntry === true;
  const [revealed, setRevealed] = useState(false);

  return (
    <View className="w-full">
      {label ? <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text> : null}

      <View className="relative w-full justify-center">
        <TextInput
          placeholderTextColor="#9CA3AF"
          className={[
            'w-full rounded-xl border px-4 py-3 text-base text-gray-900',
            // Place réservée à l'œil : sans elle, le texte passerait dessous.
            isPassword ? 'pr-12' : '',
            error ? 'border-red-500' : 'border-gray-200',
            className ?? '',
          ].join(' ')}
          {...textInputProps}
          secureTextEntry={isPassword && !revealed}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
            className="absolute right-3 p-1"
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9CA3AF"
            />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text className="mt-1 text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
