import { Text, View, type ViewProps } from 'react-native';
import type { OrderStatus, TripStatus } from '@/types/api.types';

export type BadgeStatus = OrderStatus | TripStatus;

export interface BadgeProps extends ViewProps {
  status?: BadgeStatus;
  label?: string;
}

interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const STATUS_STYLES: Record<BadgeStatus, StatusStyle> = {
  UPCOMING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'À venir' },
  COLLECTING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Collecte' },
  IN_TRANSIT: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'En transit' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Terminé' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' },
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En attente' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmée' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Livrée' },
  DISPUTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Litige' },
  REFUNDED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Remboursée' },
};

const DEFAULT_STYLE: StatusStyle = { bg: 'bg-gray-100', text: 'text-gray-700', label: '' };

export function Badge({ status, label, className, ...viewProps }: BadgeProps) {
  const style = status ? STATUS_STYLES[status] : DEFAULT_STYLE;
  const text = label ?? style.label;

  return (
    <View
      className={['self-start rounded-full px-3 py-1', style.bg, className ?? ''].join(' ')}
      {...viewProps}
    >
      <Text className={['text-xs font-medium', style.text].join(' ')}>{text}</Text>
    </View>
  );
}
