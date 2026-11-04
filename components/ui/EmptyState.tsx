import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { useAppLanguage } from '@/lib/appLanguage';

export interface EmptyStateProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title?: string;
  description?: string;
  /** Action de sortie — réessayer, parcourir le catalogue, etc. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const { t } = useAppLanguage();
  return (
    <View
      className={['flex-1 items-center justify-center px-8 py-12', className ?? ''].join(' ')}
    >
      <Ionicons name={icon} size={48} color="#9CA3AF" />
      <Text className="mt-4 text-center text-base font-semibold text-gray-900">
        {title ?? t('Rien à afficher', 'Nothing to display')}
      </Text>
      {description ? (
        <Text className="mt-1 text-center text-sm text-gray-500">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction} className="mt-5">
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
