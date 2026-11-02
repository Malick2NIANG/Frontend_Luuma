import { Ionicons } from '@expo/vector-icons';
import { Pressable, Switch, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export function SettingsGroup({ label }: { label: string }) {
  return (
    <Text className="bg-gray-100 px-3.5 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
      {label}
    </Text>
  );
}

export interface SettingsRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Fournir `value` bascule la ligne en interrupteur au lieu d'un chevron. */
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * Ligne de réglage — la brique commune du profil et des réglages.
 *
 * Elle porte les deux formes possibles (navigation et interrupteur) parce que
 * les distinguer en deux composants dupliquerait la mise en page sans que
 * rien ne garantisse qu'elles restent alignées.
 */
export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  value,
  onValueChange,
  disabled = false,
  destructive = false,
}: SettingsRowProps) {
  const isSwitch = value !== undefined;

  return (
    <Pressable
      onPress={isSwitch || disabled ? undefined : onPress}
      disabled={disabled || isSwitch}
      className={[
        'flex-row items-center gap-3 border-b border-gray-50 px-3.5 py-3',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-emerald-50">
        <Ionicons
          name={icon}
          size={16}
          color={destructive ? '#DC2626' : colors.primary}
        />
      </View>

      <View className="flex-1">
        <Text
          className={[
            'text-[13px] font-semibold',
            destructive ? 'text-red-600' : 'text-gray-900',
          ].join(' ')}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[10.5px] text-gray-500">{subtitle}</Text>
        ) : null}
      </View>

      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: colors.primary, false: '#D5D5D5' }}
          thumbColor={colors.white}
        />
      ) : disabled ? null : (
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
      )}
    </Pressable>
  );
}
