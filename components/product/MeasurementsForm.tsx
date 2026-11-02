import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';

/**
 * Libellés des mesures.
 *
 * Les clés sont stables et stockées telles quelles sur la commande ; seuls
 * ces libellés changent. C'est ce qui permet de reformuler « tour_poitrine »
 * en français plus tard sans invalider les mesures déjà enregistrées.
 */
const MEASUREMENT_LABELS: Record<string, string> = {
  tour_poitrine: 'Tour de poitrine',
  tour_taille: 'Tour de taille',
  tour_hanches: 'Tour de hanches',
  tour_cou: 'Tour de cou',
  tour_bras: 'Tour de bras',
  tour_cuisse: 'Tour de cuisse',
  longueur_dos: 'Longueur de dos',
  longueur_manche: 'Longueur de manche',
  longueur_jambe: 'Longueur de jambe',
  longueur_totale: 'Longueur totale',
  carrure: 'Carrure',
  epaule: 'Épaule',
};

function labelFor(key: string): string {
  // Repli lisible plutôt que la clé brute : un commerçant peut inventer une
  // mesure que cette table ne connaît pas encore.
  return MEASUREMENT_LABELS[key] ?? key.replace(/_/g, ' ');
}

export interface MeasurementsFormProps {
  required: string[];
  values: Record<string, number>;
  productionDays: number | null;
  onChange: (values: Record<string, number>) => void;
}

export function MeasurementsForm({
  required,
  values,
  productionDays,
  onChange,
}: MeasurementsFormProps) {
  const setValue = (key: string, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    const next = { ...values };

    if (digits === '') delete next[key];
    else next[key] = Number(digits);

    onChange(next);
  };

  return (
    <View>
      <Text className="mb-1 text-sm font-semibold text-gray-900">
        Vos mesures
      </Text>
      <Text className="mb-3 text-xs text-gray-500">
        En centimètres. Elles sont transmises au commerçant et conservées avec
        votre commande.
      </Text>

      <View className="gap-2.5">
        {required.map((key) => (
          <View key={key} className="flex-row items-center gap-3">
            <Text className="flex-1 text-[13px] text-gray-700">
              {labelFor(key)}
            </Text>
            <View className="flex-row items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2">
              <TextInput
                value={values[key] ? String(values[key]) : ''}
                onChangeText={(text) => setValue(key, text)}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor="#9CA3AF"
                accessibilityLabel={`${labelFor(key)} en centimètres`}
                className="w-14 text-center text-[13px] text-gray-900"
              />
              <Text className="text-[11px] text-gray-400">cm</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Le délai n'est pas une mention légale : c'est l'information qui
          décide de commander ou non, et elle conditionne aussi quels GP
          seront proposés à l'étape suivante. */}
      {productionDays ? (
        <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
          <Ionicons name="time-outline" size={16} color="#B45309" />
          <Text className="flex-1 text-xs leading-4 text-amber-800">
            Confection en {productionDays} jours. Seuls les GP partant après ce
            délai pourront transporter votre commande.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Vrai quand toutes les mesures exigées sont renseignées. */
export function measurementsComplete(
  required: string[],
  values: Record<string, number>,
): boolean {
  return required.every(
    (key) => typeof values[key] === 'number' && values[key] > 0,
  );
}
