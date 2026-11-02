import { useState } from 'react';
import { Pressable, Text, View, type TextLayoutEventData } from 'react-native';

/**
 * Longueur au-delà de laquelle on suppose le texte tronqué.
 *
 * Repli pour le web, où `onTextLayout` ne se déclenche pas : sans lui, le
 * bouton « plus » n'apparaîtrait jamais dans le navigateur. Approximation
 * assumée — environ 45 caractères par ligne à cette taille de police.
 */
const CHARS_PER_LINE = 45;

export interface ExpandableTextProps {
  text: string;
  /** Nombre de lignes visibles à l'état replié. */
  lines?: number;
  className?: string;
}

/**
 * Texte replié avec un « plus » qui déplie SUR PLACE.
 *
 * La distinction est importante dans le fil : appuyer sur l'image ou le titre
 * ouvre la fiche produit, appuyer sur l'avatar ouvre la boutique, et « plus »
 * ne fait ni l'un ni l'autre — il montre la suite de la description sans
 * quitter le fil. Trois gestes, trois résultats.
 *
 * D'où le `Pressable` séparé, placé HORS de la zone qui navigue : imbriqué,
 * il déclencherait les deux à la fois et « plus » ouvrirait la fiche produit
 * au lieu de déplier. Ce piège s'est déjà présenté sur les cartes de trajet et
 * le bouton panier.
 */
export function ExpandableText({
  text,
  lines = 2,
  className = 'text-[13px] leading-5 text-gray-700',
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [measuredLines, setMeasuredLines] = useState<number | null>(null);

  const handleTextLayout = (event: {
    nativeEvent: TextLayoutEventData;
  }) => {
    // Ne mesure qu'une fois, à l'état replié : déplié, le nombre de lignes
    // devient celui du texte entier et le bouton disparaîtrait aussitôt.
    if (measuredLines === null && !expanded) {
      setMeasuredLines(event.nativeEvent.lines.length);
    }
  };

  const isTruncated =
    measuredLines !== null
      ? measuredLines > lines
      : text.length > CHARS_PER_LINE * lines;

  return (
    <View>
      <Text
        numberOfLines={expanded ? undefined : lines}
        onTextLayout={handleTextLayout}
        className={className}
      >
        {text}
      </Text>

      {isTruncated ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? 'Réduire la description' : 'Afficher toute la description'
          }
          className="mt-0.5 self-start"
        >
          <Text className="text-[12px] font-semibold text-gray-500">
            {expanded ? 'moins' : 'plus'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
