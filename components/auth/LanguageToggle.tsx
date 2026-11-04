import { Pressable, Text, View } from 'react-native';
import { useAppLanguage } from '@/lib/appLanguage';

export function LanguageToggle({ light = false }: { light?: boolean }) {
  const { language, setLanguage, t } = useAppLanguage();

  return (
    <View
      className={[
        'flex-row rounded-full border p-1',
        light ? 'border-white/40 bg-white/10' : 'border-gray-200 bg-gray-100',
      ].join(' ')}
    >
      {(['fr', 'en'] as const).map((option) => {
        const selected = language === option;
        const label = option === 'fr' ? 'Français' : 'English';

        return (
          <Pressable
            key={option}
            onPress={() => setLanguage(option)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            className={[
              'min-h-8 min-w-12 items-center justify-center rounded-full px-3',
              selected ? 'bg-white' : '',
            ].join(' ')}
          >
            <Text
              className={[
                'text-xs font-semibold tracking-wide',
                selected ? 'text-gray-900' : 'text-gray-500',
              ].join(' ')}
            >
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
