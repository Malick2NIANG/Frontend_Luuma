import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps;

export function Card({ className, children, ...viewProps }: CardProps) {
  return (
    <View
      className={['rounded-2xl bg-white p-4 shadow-sm', className ?? ''].join(' ')}
      {...viewProps}
    >
      {children}
    </View>
  );
}
