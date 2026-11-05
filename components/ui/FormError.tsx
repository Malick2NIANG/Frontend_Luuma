import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/**
 * Message d'erreur d'un formulaire entier — « Email ou mot de passe
 * incorrect », « Un compte existe déjà avec cet email ».
 *
 * Il s'affichait en `text-white` sur les écrans d'authentification, c'est-à-
 * dire dans la même couleur que les labels, les placeholders et le texte
 * saisi. La seule information que la personne cherche à ce moment-là passait
 * pour un sous-titre décoratif.
 *
 * Trois signaux plutôt qu'un — fond coloré, pictogramme, texte semi-gras —
 * parce qu'une couleur seule n'est jamais garantie lisible au-dessus d'une
 * photo dont on ne maîtrise pas la luminosité. Le fond opaque assure le
 * contraste quelle que soit l'image derrière.
 */
export function FormError({
  message,
  light = false,
}: {
  message: string;
  light?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="w-full flex-row items-start gap-2 rounded-xl px-3 py-2.5"
      style={{
        backgroundColor: light ? 'rgba(127, 29, 29, 0.92)' : '#FEF2F2',
        borderWidth: 1,
        borderColor: light ? 'rgba(255, 209, 209, 0.5)' : '#FECACA',
      }}
    >
      <Ionicons
        name="alert-circle"
        size={16}
        color={light ? '#FFD1D1' : '#DC2626'}
        style={{ marginTop: 1 }}
      />
      <Text
        className="flex-1 text-[13px] font-medium leading-[18px]"
        style={{ color: light ? '#FFE4E4' : '#B91C1C' }}
      >
        {message}
      </Text>
    </View>
  );
}
