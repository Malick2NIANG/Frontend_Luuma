import type { ReactNode } from 'react';
import {
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps {
  title?: string;
  scroll?: boolean;
  children?: ReactNode;
  className?: string;
  contentContainerClassName?: string;
  contentMaxWidth?: number;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  title,
  scroll = false,
  children,
  className,
  contentContainerClassName,
  contentMaxWidth,
  transparent = false,
  style,
}: ScreenProps) {
  const backgroundClassName = transparent ? 'bg-transparent' : 'bg-white';
  const header = title ? (
    <Text className="mb-4 text-2xl font-bold text-gray-900">{title}</Text>
  ) : null;

  const content =
    contentMaxWidth !== undefined ? (
      <View
        style={{
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          ...(scroll ? { flexGrow: 1 } : { flex: 1 }),
        }}
      >
        {header}
        {children}
      </View>
    ) : (
      <>
        {header}
        {children}
      </>
    );

  if (scroll) {
    return (
      <SafeAreaView
        className={`flex-1 ${backgroundClassName}`}
        edges={['top', 'bottom']}
        style={style}
      >
        <ScrollView
          className={['flex-1 px-4', className ?? ''].join(' ')}
          contentContainerClassName={[
            'py-3 pb-6',
            contentContainerClassName ?? '',
          ].join(' ')}
          // Sans cela, le premier appui sur un bouton alors que le clavier est
          // ouvert ne fait que fermer le clavier : il faut appuyer deux fois.
          // Sur un formulaire d'inscription, c'est le genre de friction qui
          // fait abandonner.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${backgroundClassName}`}
      edges={['top', 'bottom']}
      style={style}
    >
      <View className={['flex-1 px-4 py-3', className ?? ''].join(' ')}>
        {content}
      </View>
    </SafeAreaView>
  );
}
