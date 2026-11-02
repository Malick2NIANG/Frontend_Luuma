import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const CONTAINER_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'border border-primary bg-white',
  ghost: 'bg-transparent',
};

const TEXT_STYLES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-primary',
  ghost: 'text-primary',
};

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#0B5C38',
  ghost: '#0B5C38',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  className,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center rounded-xl px-5 py-3',
        CONTAINER_STYLES[variant],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
        className ?? '',
      ].join(' ')}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : typeof children === 'string' ? (
        <Text className={['text-base font-semibold', TEXT_STYLES[variant]].join(' ')}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
