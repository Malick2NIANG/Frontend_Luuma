import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import {
  CURRENCY_LABELS,
  DISPLAY_CURRENCIES,
  useCurrencyStore,
  useExchangeRates,
  type DisplayCurrency,
} from '@/hooks/useCurrency';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Sélecteur de devise d'affichage.
 *
 * Posé sur la fiche produit plutôt qu'enfoui dans les réglages : c'est en
 * regardant un prix qu'on se demande ce qu'il représente, pas trois écrans
 * plus loin. Le choix est mémorisé et s'applique partout ensuite.
 */
export function CurrencyPicker() {
  const { language, t } = useAppLanguage();
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const { data, isError } = useExchangeRates();

  const [open, setOpen] = useState(false);

  /**
   * Une devise flottante sans taux est proposée mais désactivée.
   *
   * La masquer laisserait croire que Luuma ne connaît pas le dollar ; la
   * proposer sans taux afficherait un montant faux. Grisée avec un motif,
   * elle dit ce qui se passe réellement — le service de taux est injoignable.
   */
  const isAvailable = (item: DisplayCurrency): boolean =>
    item === 'XOF' || item === 'EUR' || Boolean(data?.rates[item]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t(
          `Devise d'affichage : ${CURRENCY_LABELS[currency]}`,
          `Display currency: ${currencyLabel(currency)}`,
        )}
        className="flex-row items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5"
      >
        <Text className="text-[12px] font-semibold text-gray-800">
          {currency}
        </Text>
        <Ionicons name="chevron-down" size={12} color="#6B7280" />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/35">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />

          <View className="rounded-t-3xl bg-white pb-6">
            <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
              <Text className="flex-1 text-[15px] font-bold text-gray-900">
                {t("Devise d'affichage", 'Display currency')}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityLabel={t('Fermer', 'Close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {DISPLAY_CURRENCIES.map((item) => {
              const available = isAvailable(item);
              const selected = item === currency;

              return (
                <Pressable
                  key={item}
                  disabled={!available}
                  onPress={() => {
                    setCurrency(item);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !available }}
                  className={[
                    'flex-row items-center gap-3 border-b border-gray-50 px-4 py-3.5',
                    available ? '' : 'opacity-40',
                  ].join(' ')}
                >
                  <Text className="w-12 text-[13px] font-bold text-gray-900">
                    {item}
                  </Text>
                  <Text className="flex-1 text-[13px] text-gray-700">
                    {t(CURRENCY_LABELS[item], currencyLabel(item))}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={19} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}

            <View className="px-4 pt-3">
              {isError || !data ? (
                <Text className="text-[11px] leading-4 text-gray-500">
                  {t(
                    "Les taux ne sont pas disponibles : seuls le franc CFA et l'euro peuvent être affichés. Leur parité est fixe, elle ne dépend d'aucun service extérieur.",
                    'Exchange rates are unavailable: only the CFA franc and euro can be displayed. Their exchange rate is fixed and does not rely on an external service.',
                  )}
                </Text>
              ) : (
                <Text className="text-[11px] leading-4 text-gray-500">
                  {t(
                    "Le franc CFA est arrimé à l'euro à un taux fixe. Les autres devises sont indicatives — la commande est facturée en euros.",
                    'The CFA franc is pegged to the euro at a fixed rate. Other currencies are indicative — orders are charged in euros.',
                  )}
                  {data.quotedAt
                    ? t(
                        ` Taux du ${new Date(data.quotedAt).toLocaleDateString('fr-FR')}.`,
                        ` Rate as of ${new Date(data.quotedAt).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                        )}.`,
                      )
                    : ''}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function currencyLabel(currency: DisplayCurrency): string {
  const labels: Record<DisplayCurrency, string> = {
    XOF: 'CFA franc',
    EUR: 'Euro',
    USD: 'US dollar',
    GBP: 'Pound sterling',
    CAD: 'Canadian dollar',
  };
  return labels[currency];
}
