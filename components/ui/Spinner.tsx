import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/constants/colors';

export interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullscreen?: boolean;
  className?: string;
}

export function Spinner({
  size = 'small',
  color = colors.primary,
  fullscreen = false,
  className,
}: SpinnerProps) {
  if (fullscreen) {
    return (
      <View
        className={['flex-1 items-center justify-center bg-white', className ?? ''].join(' ')}
      >
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={color} className={className} />;
}
