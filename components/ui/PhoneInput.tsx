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

export interface PhoneInputProps {
  label?: string;
  /** Code ISO du pays sélectionné. */
  countryIso: string;
  onCountryChange: (iso: string) => void;
  /** Numéro SANS indicatif, tel que la personne le tape. */
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
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
  label = 'Téléphone',
  countryIso,
  onCountryChange,
  value,
  onChangeText,
  error,
}: PhoneInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const country = findCountry(countryIso);

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      ) : null}

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Indicatif : ${country.name}, plus ${country.dial}. Modifier.`}
          className={[
            'flex-row items-center gap-1.5 rounded-xl border px-3',
            error ? 'border-red-500' : 'border-gray-200',
          ].join(' ')}
        >
          <Flag iso={country.iso} size={17} />
          <Text className="text-base text-gray-900">+{country.dial}</Text>
          <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
        </Pressable>

        <TextInput
          placeholder="77 123 45 67"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          autoComplete="tel-national"
          value={value}
          onChangeText={onChangeText}
          className={[
            'flex-1 rounded-xl border px-4 py-3 text-base text-gray-900',
            error ? 'border-red-500' : 'border-gray-200',
          ].join(' ')}
        />
      </View>

      {error ? <Text className="mt-1 text-xs text-red-500">{error}</Text> : null}

      <CountryPicker
        visible={pickerOpen}
        selectedIso={countryIso}
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
}: {
  visible: boolean;
  selectedIso: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
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
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900">
            Indicatif du pays
          </Text>
        </View>

        <View className="px-3.5 py-3">
          <View className="flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
            <Ionicons name="search" size={17} color="#9CA3AF" />
            <TextInput
              placeholder="Rechercher un pays ou un indicatif"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              className="flex-1 text-[15px] text-gray-900"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <Ionicons name="close-circle" size={17} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item: Country) => item.iso}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="px-3.5 py-8 text-center text-[13px] text-gray-500">
              Aucun pays ne correspond à « {query} ».
            </Text>
          }
          renderItem={({ item }) => {
            const selected = item.iso === selectedIso;
            return (
              <Pressable
                onPress={() => onSelect(item.iso)}
                className="flex-row items-center gap-3 border-b border-gray-50 px-3.5 py-3"
              >
                <Flag iso={item.iso} size={20} />
                <Text className="flex-1 text-[14px] text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-[13px] text-gray-500">+{item.dial}</Text>
                {selected ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={colors.primary}
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
