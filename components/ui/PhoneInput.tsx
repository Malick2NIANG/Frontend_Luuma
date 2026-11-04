import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flag } from '@/components/ui/Flag';
import { colors } from '@/constants/colors';
import {
  findCountry,
  normalizeSearch,
  orderedCountries,
  type Country,
} from '@/constants/countries';
import { useAppLanguage } from '@/lib/appLanguage';

export interface PhoneInputProps {
  label?: string;
  /** Code ISO du pays sélectionné. */
  countryIso: string;
  onCountryChange: (iso: string) => void;
  /** Numéro SANS indicatif, tel que la personne le tape. */
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  appearance?: 'default' | 'light';
}

/**
 * Saisie d'un numéro de téléphone : indicatif à part, numéro à part.
 *
 * Auparavant un seul champ demandait « +221771234567 », avec une ligne
 * d'explication en dessous. Cette ligne était l'aveu du problème : un champ
 * qui a besoin d'être expliqué est un champ mal découpé. Les gens tapaient
 * « 0771234567 » ou « 77 123 45 67 » et se faisaient refuser sans comprendre.
 *
 * Luuma n'est pas une application mono-pays — les vendeurs et GP sont au
 * Sénégal, les acheteurs en France, en Belgique, en Italie. L'indicatif est
 * une donnée à choisir, pas une constante à préfixer.
 */
export function PhoneInput({
  label,
  countryIso,
  onCountryChange,
  value,
  onChangeText,
  error,
  appearance = 'default',
}: PhoneInputProps) {
  const { t } = useAppLanguage();
  const isLight = appearance === 'light';
  const [pickerOpen, setPickerOpen] = useState(false);
  const country = findCountry(countryIso);
  const labelText = label ?? t('Téléphone', 'Phone');

  return (
    <View className="w-full">
      {labelText ? (
        <Text
          className={[
            'mb-1 text-sm font-medium',
            isLight ? 'text-white' : 'text-gray-700',
          ].join(' ')}
        >
          {labelText}
        </Text>
      ) : null}

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t(
            `Indicatif : ${country.name}, plus ${country.dial}. Modifier.`,
            `Calling code: ${country.name}, plus ${country.dial}. Change.`,
          )}
          className={[
            'flex-row items-center gap-1.5 rounded-xl border px-3',
            isLight ? 'bg-white/10' : '',
            error
              ? isLight
                ? 'border-red-300'
                : 'border-red-500'
              : isLight
                ? 'border-white/50'
                : 'border-gray-200',
          ].join(' ')}
          style={
            isLight
              ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: error ? '#FCA5A5' : 'rgba(255, 255, 255, 0.5)',
                }
              : undefined
          }
        >
          <Flag iso={country.iso} size={17} />
          <Text
            className={[
              'text-base',
              isLight ? 'text-white' : 'text-gray-900',
            ].join(' ')}
          >
            +{country.dial}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={isLight ? '#FFFFFF' : '#9CA3AF'}
          />
        </Pressable>

        <TextInput
          placeholder="77 123 45 67"
          placeholderTextColor={isLight ? '#FFFFFF' : '#9CA3AF'}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          value={value}
          onChangeText={onChangeText}
          className={[
            'flex-1 rounded-xl border px-4 py-3 text-base',
            isLight ? 'text-white' : 'text-gray-900',
            error
              ? isLight
                ? 'border-red-300'
                : 'border-red-500'
              : isLight
                ? 'border-white/50'
                : 'border-gray-200',
          ].join(' ')}
          style={
            isLight
              ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: error ? '#FCA5A5' : 'rgba(255, 255, 255, 0.5)',
                }
              : undefined
          }
        />
      </View>

      {error ? (
        <Text
          className={
            isLight ? 'mt-1 text-xs text-white' : 'mt-1 text-xs text-red-500'
          }
        >
          {error}
        </Text>
      ) : null}

      <CountryPicker
        visible={pickerOpen}
        selectedIso={countryIso}
        appearance={appearance}
        onSelect={(iso) => {
          onCountryChange(iso);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function CountryPicker({
  visible,
  selectedIso,
  onSelect,
  onClose,
  appearance = 'default',
}: {
  visible: boolean;
  selectedIso: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  appearance?: 'default' | 'light';
}) {
  const { t } = useAppLanguage();
  const isLight = appearance === 'light';
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const all = orderedCountries();
    const needle = normalizeSearch(query);
    if (!needle) return all;

    // Recherche sur le NOM et sur l'INDICATIF : certains cherchent « Sénégal »,
    // d'autres tapent directement « 221 » parce qu'ils le connaissent par cœur.
    return all.filter(
      (country) =>
        normalizeSearch(country.name).includes(needle) ||
        country.dial.startsWith(needle.replace('+', '')),
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        className={isLight ? 'flex-1' : 'flex-1 bg-white'}
        style={isLight ? { backgroundColor: '#10231A' } : undefined}
        edges={['top', 'bottom']}
      >
        <View
          className={[
            'flex-row items-center gap-3 border-b px-3.5 pb-2.5 pt-1',
            isLight ? 'border-white/20' : 'border-gray-100',
          ].join(' ')}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('Fermer', 'Close')}
          >
            <Ionicons
              name="close"
              size={24}
              color={isLight ? '#FFFFFF' : colors.text}
            />
          </Pressable>
          <Text
            className={[
              'flex-1 text-lg font-bold',
              isLight ? 'text-white' : 'text-gray-900',
            ].join(' ')}
          >
            {t('Indicatif du pays', 'Country calling code')}
          </Text>
        </View>

        <View className="px-3.5 py-3">
          <View
            className={[
              'flex-row items-center gap-2 rounded-xl px-3 py-2.5',
              isLight ? 'bg-white/10' : 'bg-gray-100',
            ].join(' ')}
          >
            <Ionicons
              name="search"
              size={17}
              color={isLight ? '#FFFFFF' : '#9CA3AF'}
            />
            <TextInput
              placeholder={t(
                'Rechercher un pays ou un indicatif',
                'Search for a country or calling code',
              )}
              placeholderTextColor={isLight ? '#FFFFFF' : '#9CA3AF'}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              className={[
                'flex-1 text-[15px]',
                isLight ? 'text-white' : 'text-gray-900',
              ].join(' ')}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('Effacer la recherche', 'Clear search')}
              >
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={isLight ? '#FFFFFF' : '#9CA3AF'}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item: Country) => item.iso}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text
              className={[
                'px-3.5 py-8 text-center text-[13px]',
                isLight ? 'text-white' : 'text-gray-500',
              ].join(' ')}
            >
              {t(
                `Aucun pays ne correspond à « ${query} ».`,
                `No country matches “${query}”.`,
              )}
            </Text>
          }
          renderItem={({ item }) => {
            const selected = item.iso === selectedIso;
            return (
              <Pressable
                onPress={() => onSelect(item.iso)}
                className={[
                  'flex-row items-center gap-3 border-b px-3.5 py-3',
                  isLight ? 'border-white/10' : 'border-gray-50',
                ].join(' ')}
              >
                <Flag iso={item.iso} size={20} />
                <Text
                  className={[
                    'flex-1 text-[14px]',
                    isLight ? 'text-white' : 'text-gray-900',
                  ].join(' ')}
                >
                  {item.name}
                </Text>
                <Text
                  className={[
                    'text-[13px]',
                    isLight ? 'text-white' : 'text-gray-500',
                  ].join(' ')}
                >
                  +{item.dial}
                </Text>
                {selected ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={isLight ? '#FFFFFF' : colors.primary}
                  />
                ) : (
                  <View className="w-[18px]" />
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
