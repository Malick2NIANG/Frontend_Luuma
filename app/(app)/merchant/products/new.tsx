import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useGoBack } from '@/hooks/useGoBack';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUpload } from '@/hooks/useUpload';
import { api } from '@/lib/api';
import { isVideo } from '@/lib/media';
import { parseDecimal } from '@/lib/numbers';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_SIZES,
  type ProductCategory,
  type ProductKind,
  type ProductSize,
} from '@/types/api.types';

const MAX_MEDIA = 10;

/**
 * Le mode de vente, expliqué par l'usage et non par le terme technique.
 *
 * « VARIANT » ne veut rien dire pour un tailleur de Sandaga. « Plusieurs
 * tailles ou couleurs », si — et c'est ce choix qui détermine tout ce que
 * l'acheteur devra préciser avant de commander.
 */
const KINDS: {
  key: ProductKind;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    key: 'SIMPLE',
    label: 'Article simple',
    hint: 'Un prix, un poids. Bijoux, épices, cosmétiques.',
    icon: 'cube-outline',
  },
  {
    key: 'VARIANT',
    label: 'Plusieurs tailles ou couleurs',
    hint: "L'acheteur choisit avant d'ajouter au panier.",
    icon: 'shirt-outline',
  },
  {
    key: 'MADE_TO_ORDER',
    label: 'Sur-mesure',
    hint: "L'acheteur saisit ses mesures, vous confectionnez.",
    icon: 'cut-outline',
  },
  {
    key: 'BY_LENGTH',
    label: 'Vendu au mètre',
    hint: 'Tissu, ruban, galon. Prix et poids par unité.',
    icon: 'resize-outline',
  },
];

/** Mesures courantes de la couture sénégalaise, en clés stables. */
const MEASUREMENTS: { key: string; label: string }[] = [
  { key: 'tour_poitrine', label: 'Tour de poitrine' },
  { key: 'tour_taille', label: 'Tour de taille' },
  { key: 'tour_hanches', label: 'Tour de hanches' },
  { key: 'longueur_dos', label: 'Longueur dos' },
  { key: 'longueur_manche', label: 'Longueur manche' },
  { key: 'tour_bras', label: 'Tour de bras' },
  { key: 'tour_cou', label: 'Tour de cou' },
  { key: 'carrure', label: 'Carrure' },
  { key: 'longueur_jupe', label: 'Longueur jupe' },
  { key: 'longueur_pantalon', label: 'Longueur pantalon' },
];

interface DraftVariant {
  /** Identifiant local uniquement : la déclinaison n'existe pas encore. */
  localId: string;
  size: ProductSize | null;
  colorName: string;
  weight: string;
  stock: string;
}

function newDraftVariant(): DraftVariant {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    size: null,
    colorName: '',
    weight: '',
    stock: '',
  };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wide text-gray-400">
      {children}
    </Text>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'rounded-full border px-3 py-1.5',
        active ? 'border-primary bg-primary' : 'border-gray-200 bg-white',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[12px] font-semibold',
          active ? 'text-white' : 'text-gray-700',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function NewProductScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/shop');
  const queryClient = useQueryClient();
  const { isReady } = useRequireAuth('/(app)/merchant/products/new');
  const { upload } = useUpload();

  const [media, setMedia] = useState<{ uri: string; contentType: string }[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('VETEMENTS');
  const [subCategory, setSubCategory] = useState('');
  const [kind, setKind] = useState<ProductKind>('SIMPLE');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [unitLabel, setUnitLabel] = useState('mètre');
  const [minQuantity, setMinQuantity] = useState('1');
  const [productionDays, setProductionDays] = useState('');
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [variants, setVariants] = useState<DraftVariant[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      // Les fichiers ne partent qu'à la validation, pas à la sélection : sur
      // une connexion sénégalaise, envoyer dix photos qu'on abandonne ensuite
      // coûte des données pour rien.
      const uploadedUrls: string[] = [];

      for (const [index, item] of media.entries()) {
        setUploadProgress(`Envoi du média ${index + 1} sur ${media.length}…`);
        const result = await upload({
          uri: item.uri,
          category: 'product',
          contentType: item.contentType,
        });

        if (!result?.fileUrl) {
          throw new Error("L'envoi d'un média a échoué. Réessayez.");
        }
        uploadedUrls.push(result.fileUrl);
      }

      setUploadProgress('Création du produit…');

      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        subCategory: subCategory.trim() || undefined,
        kind,
        price: parseDecimal(price),
        weight: parseDecimal(weight),
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      };

      if (kind === 'BY_LENGTH') {
        payload.unitLabel = unitLabel.trim() || 'mètre';
        payload.minQuantity = parseDecimal(minQuantity) ?? 1;
      }

      if (kind === 'MADE_TO_ORDER') {
        payload.productionDays = parseDecimal(productionDays);
        payload.requiredMeasurements = measurements;
      }

      if (kind === 'VARIANT' && variants.length > 0) {
        payload.variants = variants.map((variant) => ({
          size: variant.size ?? undefined,
          colorName: variant.colorName.trim() || undefined,
          weight: parseDecimal(variant.weight),
          stock:
            variant.stock.trim() === ''
              ? undefined
              : parseDecimal(variant.stock),
        }));
      }

      const { data } = await api.post('/api/products', payload);
      return data as { id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['merchant'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      setUploadProgress(null);
      router.replace('/(app)/(tabs)/shop');
    },
    onError: (caught) => {
      setUploadProgress(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'La création a échoué. Réessayez.',
      );
    },
  });

  if (!isReady) return <View className="flex-1 bg-white" />;

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("L'accès à vos photos est nécessaire pour illustrer le produit.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - media.length,
      quality: 0.85,
    });

    if (result.canceled) return;

    const picked = result.assets.map((asset) => ({
      uri: asset.uri,
      // `mimeType` est renseigné sur la plupart des plateformes ; le repli se
      // déduit du type d'asset, que le sélecteur garantit toujours.
      contentType:
        asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    }));

    setMedia((current) => [...current, ...picked].slice(0, MAX_MEDIA));
    setError(null);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Le nom du produit est obligatoire.';

    const parsedPrice = parseDecimal(price);
    if (parsedPrice === null || parsedPrice <= 0) {
      return 'Indiquez un prix en FCFA supérieur à 0.';
    }

    const parsedWeight = parseDecimal(weight);
    if (parsedWeight === null || parsedWeight <= 0) {
      return 'Indiquez un poids en kilos supérieur à 0.';
    }

    if (kind === 'MADE_TO_ORDER') {
      const days = parseDecimal(productionDays);
      if (days === null || days < 1) {
        return 'Indiquez le délai de confection, en jours.';
      }
      if (measurements.length === 0) {
        return 'Choisissez au moins une mesure à demander à l’acheteur.';
      }
    }

    if (kind === 'BY_LENGTH') {
      const minimum = parseDecimal(minQuantity);
      if (minimum === null || minimum <= 0) {
        return 'Indiquez la quantité minimale commandable.';
      }
    }

    if (kind === 'VARIANT') {
      for (const variant of variants) {
        const variantWeight = parseDecimal(variant.weight);
        if (variantWeight === null || variantWeight <= 0) {
          // Le poids par déclinaison est tout l'intérêt du modèle : c'est lui
          // qui est réservé sur la capacité du GP. Un XXL facturé au poids du
          // XS fait perdre de l'argent au GP à chaque envoi.
          return 'Chaque déclinaison doit avoir un poids en kilos.';
        }
        if (!variant.size && !variant.colorName.trim()) {
          return 'Chaque déclinaison doit avoir au moins une taille ou une couleur.';
        }
      }
    }

    return null;
  };

  const handleSubmit = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    create.mutate();
  };

  const priceHint =
    kind === 'BY_LENGTH'
      ? `Prix par ${unitLabel.trim() || 'unité'}`
      : 'Prix en FCFA';
  const weightHint =
    kind === 'BY_LENGTH'
      ? `Poids par ${unitLabel.trim() || 'unité'}, en kg`
      : 'Poids en kg, emballage compris';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-gray-900">
          Nouveau produit
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="px-3.5 pb-10" keyboardShouldPersistTaps="handled">
          <SectionTitle>Photos et vidéos</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {media.map((item, index) => (
                <View key={`${item.uri}-${index}`} className="relative">
                  <View className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
                    {isVideo(item.contentType) || item.contentType.startsWith('video') ? (
                      <View className="h-full w-full items-center justify-center bg-gray-800">
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: item.uri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    )}
                  </View>
                  <Pressable
                    onPress={() =>
                      setMedia((current) => current.filter((_, i) => i !== index))
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Retirer ce média"
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-gray-900"
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}

              {media.length < MAX_MEDIA ? (
                <Pressable
                  onPress={pickMedia}
                  className="h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300"
                >
                  <Ionicons name="add" size={22} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
          <Text className="mt-1.5 text-[10.5px] text-gray-400">
            {media.length}/{MAX_MEDIA} · la première image sert de vignette.
          </Text>

          <SectionTitle>Le produit</SectionTitle>
          <View className="gap-4">
            <Input
              label="Nom"
              placeholder="Boubou bazin riche brodé"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Description"
              placeholder="Matière, finitions, entretien…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={{ height: 96, textAlignVertical: 'top' }}
            />
          </View>

          <SectionTitle>Catégorie</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {PRODUCT_CATEGORIES.map((value) => (
              <Chip
                key={value}
                label={PRODUCT_CATEGORY_LABELS[value]}
                active={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>
          <View className="mt-4">
            <Input
              label="Précision (facultatif)"
              placeholder="bazin homme, taille-basse…"
              value={subCategory}
              onChangeText={setSubCategory}
            />
            <Text className="mt-1 text-[10.5px] text-gray-400">
              Aide la recherche à trouver votre produit.
            </Text>
          </View>

          <SectionTitle>Mode de vente</SectionTitle>
          <View className="gap-2">
            {KINDS.map((item) => {
              const active = kind === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setKind(item.key)}
                  className={[
                    'flex-row items-center gap-3 rounded-xl border p-3',
                    active ? 'border-primary bg-emerald-50' : 'border-gray-200',
                  ].join(' ')}
                >
                  <Ionicons
                    name={item.icon}
                    size={19}
                    color={active ? colors.primary : '#9CA3AF'}
                  />
                  <View className="flex-1">
                    <Text
                      className={[
                        'text-[13px] font-semibold',
                        active ? 'text-primary' : 'text-gray-900',
                      ].join(' ')}
                    >
                      {item.label}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-gray-500">
                      {item.hint}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {kind === 'BY_LENGTH' ? (
            <View className="mt-4 gap-4">
              <Input
                label="Unité de vente"
                placeholder="mètre"
                value={unitLabel}
                onChangeText={setUnitLabel}
              />
              <Input
                label="Quantité minimale"
                placeholder="1"
                keyboardType="decimal-pad"
                value={minQuantity}
                onChangeText={setMinQuantity}
              />
            </View>
          ) : null}

          {kind === 'MADE_TO_ORDER' ? (
            <View className="mt-4">
              <Input
                label="Délai de confection (jours)"
                placeholder="14"
                keyboardType="number-pad"
                value={productionDays}
                onChangeText={setProductionDays}
              />
              <Text className="mt-1 text-[10.5px] text-gray-400">
                Luuma refusera automatiquement les GP qui partent avant la fin de
                ce délai.
              </Text>

              <Text className="mb-2 mt-4 text-[12px] font-semibold text-gray-900">
                Mesures à demander à l'acheteur
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {MEASUREMENTS.map((item) => (
                  <Chip
                    key={item.key}
                    label={item.label}
                    active={measurements.includes(item.key)}
                    onPress={() =>
                      setMeasurements((current) =>
                        current.includes(item.key)
                          ? current.filter((k) => k !== item.key)
                          : [...current, item.key],
                      )
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}

          <SectionTitle>Prix et poids</SectionTitle>
          <View className="gap-4">
            <View>
              <Input
                label={priceHint}
                placeholder="25000"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
              <Text className="mt-1 text-[10.5px] text-gray-400">
                La conversion en euros est calculée automatiquement.
              </Text>
            </View>
            <View>
              <Input
                label={weightHint}
                placeholder="1,2"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
              <Text className="mt-1 text-[10.5px] text-gray-400">
                Le poids détermine ce que l'acheteur paiera au GP. Un poids
                sous-estimé se retourne contre vous à la remise du colis.
              </Text>
            </View>
          </View>

          {kind === 'VARIANT' ? (
            <>
              <SectionTitle>Déclinaisons</SectionTitle>
              <Text className="mb-3 text-[11px] leading-4 text-gray-500">
                Chaque taille ou couleur a son propre poids : c'est lui qui est
                réservé sur la valise du GP. Vous pourrez en ajouter d'autres
                plus tard.
              </Text>

              <View className="gap-3">
                {variants.map((variant, index) => (
                  <View
                    key={variant.localId}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-[12px] font-semibold text-gray-900">
                        Déclinaison {index + 1}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setVariants((current) =>
                            current.filter((v) => v.localId !== variant.localId),
                          )
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer cette déclinaison"
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </Pressable>
                    </View>

                    <View className="mb-3 flex-row flex-wrap gap-1.5">
                      {PRODUCT_SIZES.map((size) => (
                        <Chip
                          key={size}
                          label={size === 'ONE_SIZE' ? 'Unique' : size}
                          active={variant.size === size}
                          onPress={() =>
                            setVariants((current) =>
                              current.map((v) =>
                                v.localId === variant.localId
                                  ? { ...v, size: v.size === size ? null : size }
                                  : v,
                              ),
                            )
                          }
                        />
                      ))}
                    </View>

                    <View className="gap-3">
                      <Input
                        label="Couleur"
                        placeholder="Bleu indigo"
                        value={variant.colorName}
                        onChangeText={(text) =>
                          setVariants((current) =>
                            current.map((v) =>
                              v.localId === variant.localId
                                ? { ...v, colorName: text }
                                : v,
                            ),
                          )
                        }
                      />
                      <Input
                        label="Poids (kg)"
                        placeholder="1,4"
                        keyboardType="decimal-pad"
                        value={variant.weight}
                        onChangeText={(text) =>
                          setVariants((current) =>
                            current.map((v) =>
                              v.localId === variant.localId
                                ? { ...v, weight: text }
                                : v,
                            ),
                          )
                        }
                      />
                      <Input
                        label="Stock (laisser vide si non suivi)"
                        placeholder="5"
                        keyboardType="number-pad"
                        value={variant.stock}
                        onChangeText={(text) =>
                          setVariants((current) =>
                            current.map((v) =>
                              v.localId === variant.localId
                                ? { ...v, stock: text }
                                : v,
                            ),
                          )
                        }
                      />
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() =>
                  setVariants((current) => [...current, newDraftVariant()])
                }
                className="mt-3 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-3"
              >
                <Ionicons name="add" size={17} color={colors.primary} />
                <Text className="text-[12.5px] font-semibold text-primary">
                  Ajouter une déclinaison
                </Text>
              </Pressable>
            </>
          ) : null}

          {error ? (
            <Text className="mt-5 text-center text-[12.5px] text-red-500">
              {error}
            </Text>
          ) : null}

          {uploadProgress ? (
            <Text className="mt-5 text-center text-[12px] text-gray-500">
              {uploadProgress}
            </Text>
          ) : null}

          <View className="mt-6">
            <Button onPress={handleSubmit} loading={create.isPending} fullWidth>
              Publier le produit
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
