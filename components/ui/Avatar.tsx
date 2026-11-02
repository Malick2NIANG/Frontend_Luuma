import { Image } from 'expo-image';
import { Text, View, type ViewProps } from 'react-native';

export interface AvatarProps extends ViewProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '?';
}

export function Avatar({ uri, name, size = 40, className, ...viewProps }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={dimension}
        className={['bg-gray-100', className ?? ''].join(' ')}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={dimension}
      className={['items-center justify-center bg-primary', className ?? ''].join(' ')}
      {...viewProps}
    >
      <Text style={{ fontSize: size * 0.4 }} className="font-semibold text-white">
        {getInitials(name)}
      </Text>
    </View>
  );
}
