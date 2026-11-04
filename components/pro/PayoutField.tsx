import { Pressable, Text, TextInput, View } from 'react-native';
import {
  PAYOUT_LABELS,
  type GpPayoutMethod,
} from '@/hooks/useProfessional';
import { useAppLanguage } from '@/lib/appLanguage';

export interface PayoutFieldProps<T extends string> {
  methods: readonly T[];
  method: T | null;
  account: string;
  onMethodChange: (method: T) => void;
  onAccountChange: (account: string) => void;
}

/** Ce qu'on demande comme identifiant, selon le moyen retenu. */
const ACCOUNT_PLACEHOLDERS: Record<GpPayoutMethod, string> = {
  wave: '+221 7X XXX XX XX',
  orange_money: '+221 7X XXX XX XX',
  bank: 'IBAN or account number',
  stripe: 'Stripe account email address',
};
const PAYOUT_LABELS_EN: Record<GpPayoutMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  bank: 'Bank transfer',
  stripe: 'Card (Stripe)',
};

/**
 * Moyen de versement.
 *
 * Wave et Orange Money d'abord : au Sénégal, ce sont eux qui servent
 * réellement à recevoir de l'argent, le virement bancaire venant loin
 * derrière. L'ordre de la liste n'est pas neutre — le premier choix est celui
 * que la plupart retiendront.
 */
export function PayoutField<T extends GpPayoutMethod>({
  methods,
  method,
  account,
  onMethodChange,
  onAccountChange,
}: PayoutFieldProps<T>) {
  const { t } = useAppLanguage();

  return (
    <View>
      <Text className="mb-1 text-sm font-semibold text-gray-900">
        {t('Comment souhaitez-vous être payé ?', 'How would you like to be paid?')}
      </Text>
      <Text className="mb-3 text-xs text-gray-500">
        {t(
          'Vos gains y seront versés après chaque livraison confirmée.',
          'Your earnings will be paid out here after each confirmed delivery.',
        )}
      </Text>

      <View className="gap-2">
        {methods.map((item) => {
          const isActive = method === item;
          return (
            <Pressable
              key={item}
              onPress={() => onMethodChange(item)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              className={[
                'flex-row items-center gap-3 rounded-xl border px-3.5 py-3',
                isActive ? 'border-primary bg-emerald-50' : 'border-gray-200',
              ].join(' ')}
            >
              <View
                className={[
                  'h-5 w-5 rounded-full border-2',
                  isActive ? 'border-[6px] border-primary' : 'border-gray-300',
                ].join(' ')}
              />
              <Text className="text-sm text-gray-800">
                {t(PAYOUT_LABELS[item], PAYOUT_LABELS_EN[item])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {method ? (
        <TextInput
          value={account}
          onChangeText={onAccountChange}
          placeholder={
            method === 'bank' || method === 'stripe'
              ? t(
                  method === 'bank'
                    ? 'IBAN ou numéro de compte'
                    : 'Adresse email du compte Stripe',
                  ACCOUNT_PLACEHOLDERS[method],
                )
              : ACCOUNT_PLACEHOLDERS[method]
          }
          placeholderTextColor="#9CA3AF"
          keyboardType={
            method === 'wave' || method === 'orange_money'
              ? 'phone-pad'
              : 'default'
          }
          autoCapitalize="none"
          accessibilityLabel={t(
            'Identifiant du compte de versement',
            'Payout account details',
          )}
          className="mt-3 rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900"
        />
      ) : null}
    </View>
  );
}
