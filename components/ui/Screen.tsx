import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps {
  title?: string;
  scroll?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Screen({ title, scroll = false, children, className }: ScreenProps) {
  const header = title ? (
    <Text className="mb-4 text-2xl font-bold text-gray-900">{title}</Text>
  ) : null;

  if (scroll) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <ScrollView
          className={['flex-1 px-4', className ?? ''].join(' ')}
          contentContainerClassName="py-3 pb-6"
          // Sans cela, le premier appui sur un bouton alors que le clavier est
          // ouvert ne fait que fermer le clavier : il faut appuyer deux fois.
          // Sur un formulaire d'inscription, c'est le genre de friction qui
          // fait abandonner.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {header}
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className={['flex-1 px-4 py-3', className ?? ''].join(' ')}>
        {header}
        {children}
      </View>
    </SafeAreaView>
  );
}
