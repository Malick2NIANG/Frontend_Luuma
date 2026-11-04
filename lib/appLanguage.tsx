import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AppLanguage = 'fr' | 'en';

const LANGUAGE_STORAGE_KEY = 'luum_language';

interface AppLanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (french: string, english: string) => string;
}

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('fr');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        if (active && (storedLanguage === 'fr' || storedLanguage === 'en')) {
          setLanguageState(storedLanguage);
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load the saved app language:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(
      (error: unknown) => {
        console.error('Unable to save the selected app language:', error);
      },
    );
  }, []);

  const t = useCallback(
    (french: string, english: string) =>
      language === 'fr' ? french : english,
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage(): AppLanguageContextValue {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error(
      'useAppLanguage must be used within an AppLanguageProvider.',
    );
  }
  return context;
}
