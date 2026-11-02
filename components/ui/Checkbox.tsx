import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Contenu à droite de la case — texte simple ou texte avec liens. */
  children: React.ReactNode;
  accessibilityLabel: string;
  disabled?: boolean;
}

/**
 * Case à cocher.
 *
 * La zone tactile est la case seule, pas la ligne entière : le libellé des
 * consentements contient des liens vers les documents, et un parent
 * pressable les avalerait — appuyer sur « conditions générales » cocherait
 * la case au lieu d'ouvrir le texte. On a déjà payé ce piège quatre fois
 * ailleurs dans l'application.
 */
export function Checkbox({
  checked,
  onChange,
  children,
  accessibilityLabel,
  disabled = false,
}: CheckboxProps) {
  return (
    <View className="flex-row items-start gap-3">
      <Pressable
        onPress={() => onChange(!checked)}
        disabled={disabled}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={accessibilityLabel}
        className={[
          'mt-0.5 h-5 w-5 items-center justify-center rounded border-2',
          checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white',
          disabled ? 'opacity-40' : '',
        ].join(' ')}
      >
        {checked ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
      </Pressable>

      <View className="flex-1">{children}</View>
    </View>
  );
}
