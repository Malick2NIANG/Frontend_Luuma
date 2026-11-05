import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppLanguage } from '@/lib/appLanguage';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  appearance?: 'default' | 'light';
  /** Indication affichée sous le champ tant qu'aucune erreur ne s'affiche. */
  hint?: string;
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
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    appearance = 'default',
    className,
    ...textInputProps
  },
  // La référence est transmise au TextInput sous-jacent : sans elle, aucun
  // écran ne peut donner le focus au champ suivant quand on appuie sur
  // « Suivant » au clavier, et chaque champ doit être touché à la main.
  ref,
) {
  const { t } = useAppLanguage();
  const isPassword = textInputProps.secureTextEntry === true;
  const isLight = appearance === 'light';
  const [revealed, setRevealed] = useState(false);

  return (
    <View className="w-full">
      {label ? (
        <Text
          className={[
            'mb-1 text-sm font-medium',
            isLight ? 'text-white' : 'text-gray-700',
          ].join(' ')}
        >
          {label}
        </Text>
      ) : null}

      <View className="relative w-full justify-center">
        <TextInput
          ref={ref}
          placeholderTextColor={isLight ? 'rgba(255,255,255,0.75)' : '#9CA3AF'}
          className={[
            'w-full rounded-xl border px-4 py-3 text-base focus:outline-none',
            isLight
              ? 'text-white focus:border-white'
              : 'text-gray-900 focus:border-black',
            // Place réservée à l'œil : sans elle, le texte passerait dessous.
            isPassword ? 'pr-12' : '',
            error
              ? isLight
                ? 'border-red-300'
                : 'border-red-500'
              : isLight
                ? 'border-white/50'
                : 'border-gray-200',
            className ?? '',
          ].join(' ')}
          style={
            isLight
              ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: error ? '#FCA5A5' : 'rgba(255, 255, 255, 0.5)',
                }
              : undefined
          }
          {...textInputProps}
          secureTextEntry={isPassword && !revealed}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              revealed
                ? t('Masquer le mot de passe', 'Hide password')
                : t('Afficher le mot de passe', 'Show password')
            }
            className="absolute right-3 p-1"
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={isLight ? '#FFFFFF' : '#9CA3AF'}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Sur fond photo, l'erreur s'affichait en blanc — exactement la
          couleur du label, du placeholder et du texte saisi. Le seul message
          que la personne cherche se fondait dans le décor. Rouge clair,
          semi-gras, précédé d'un pictogramme : trois signaux plutôt qu'un,
          parce qu'aucune couleur seule n'est garantie lisible au-dessus
          d'une image qui change. */}
      {error ? (
        <View className="mt-1 flex-row items-center gap-1">
          {isLight ? (
            <Ionicons name="alert-circle" size={13} color="#FFD1D1" />
          ) : null}
          <Text
            className={[
              'flex-1 text-xs',
              isLight ? 'font-semibold' : '',
            ].join(' ')}
            style={isLight ? { color: '#FFD1D1' } : { color: '#EF4444' }}
          >
            {error}
          </Text>
        </View>
      ) : hint ? (
        /* L'indication cède la place à l'erreur plutôt que de s'y ajouter :
           deux messages sous un même champ se contredisent à l'œil, et c'est
           l'erreur qui doit être lue. */
        <Text
          className={[
            'mt-1 text-xs',
            isLight ? 'text-white/80' : 'text-gray-500',
          ].join(' ')}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
