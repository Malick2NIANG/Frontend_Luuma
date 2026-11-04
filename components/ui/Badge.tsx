import { Text, View, type ViewProps } from 'react-native';
import { useAppLanguage } from '@/lib/appLanguage';
import type { OrderStatus, TripStatus } from '@/types/api.types';

export type BadgeStatus = OrderStatus | TripStatus;

export interface BadgeProps extends ViewProps {
  status?: BadgeStatus;
  label?: string;
}

interface StatusStyle {
  bg: string;
  text: string;
  french: string;
  english: string;
}

const STATUS_STYLES: Record<BadgeStatus, StatusStyle> = {
  UPCOMING: { bg: 'bg-blue-100', text: 'text-blue-700', french: 'À venir', english: 'Upcoming' },
  COLLECTING: { bg: 'bg-amber-100', text: 'text-amber-700', french: 'Collecte', english: 'Collecting' },
  IN_TRANSIT: { bg: 'bg-indigo-100', text: 'text-indigo-700', french: 'En transit', english: 'In transit' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', french: 'Terminé', english: 'Completed' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', french: 'Annulé', english: 'Cancelled' },
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', french: 'En attente', english: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', french: 'Confirmée', english: 'Confirmed' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', french: 'Livrée', english: 'Delivered' },
  DISPUTED: { bg: 'bg-red-100', text: 'text-red-700', french: 'Litige', english: 'Disputed' },
  REFUNDED: { bg: 'bg-purple-100', text: 'text-purple-700', french: 'Remboursée', english: 'Refunded' },
};

const DEFAULT_STYLE: StatusStyle = { bg: 'bg-gray-100', text: 'text-gray-700', french: '', english: '' };

export function Badge({ status, label, className, ...viewProps }: BadgeProps) {
  const { t } = useAppLanguage();
  const style = status ? STATUS_STYLES[status] : DEFAULT_STYLE;
  const text = label ?? t(style.french, style.english);

  return (
    <View
      className={['self-start rounded-full px-3 py-1', style.bg, className ?? ''].join(' ')}
      {...viewProps}
    >
      <Text className={['text-xs font-medium', style.text].join(' ')}>{text}</Text>
    </View>
  );
}
