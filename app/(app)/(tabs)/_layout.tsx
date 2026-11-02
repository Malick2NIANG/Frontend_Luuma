import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useDirectChat';
import { useMe } from '@/hooks/useMe';

/**
 * Quatre onglets pour tout le monde — Accueil, Recherche, Messages, Profil —
 * auxquels s'ajoutent Boutique et Voyages selon les casquettes du compte.
 *
 * Ils s'AJOUTENT, ils ne remplacent rien : un compte peut être client,
 * commerçant et GP à la fois, et un utilisateur qui vend reste d'abord
 * quelqu'un qui achète. Basculer l'application en « mode vendeur » lui
 * retirerait la moitié de ce pour quoi il est là.
 *
 * `href: null` masque l'onglet sans supprimer la route : l'écran reste
 * atteignable par un lien direct, ce qui évite qu'un `router.push` vers la
 * boutique tombe dans le vide pendant le chargement de `useMe`.
 *
 * « Commandes » n'est pas un onglet. Un onglet permanent se justifie par un
 * usage quotidien ; on consulte une commande pendant les quelques jours d'un
 * transport, pas tous les jours. Il est donc passé sous le profil, où l'on va
 * chercher son propre historique — la place que lui donne aussi Amazon.
 */
export default function TabsLayout() {
  const { user } = useAuth();

  const { data: conversations } = useConversations();
  const unread =
    conversations?.reduce((total, c) => total + c.unreadCount, 0) ?? 0;

  const { me } = useMe();
  // Présent dès le dépôt du dossier, pas seulement une fois approuvé : le
  // catalogue et le trajet se préparent pendant l'examen.
  const hasShop = Boolean(me?.merchant);
  const hasGp = Boolean(me?.gp);

  // NI garde de session NI écran bloquant ici : les deux vivent dans
  // `(app)/_layout.tsx`. La garde y est seule — en avoir une à deux niveaux
  // faisait partir deux navigations concurrentes à chaque perte de session, et
  // la seconde échouait en « GO_BACK not handled ». Les écrans bloquants y
  // sont ensemble pour que leur ORDRE — vérification d'email, puis conditions
  // — se lise en un seul endroit.

  return (
    <Tabs
      /**
       * Remonte la barre d'onglets à chaque changement de compte.
       *
       * Sans cette clé, React Navigation conserve l'onglet actif : on se
       * déconnecte depuis Profil, on se reconnecte, et on retombe sur Profil
       * au lieu du fil. La garde ci-dessus est posée À L'INTÉRIEUR de ce
       * layout, donc le navigateur se monte et garde son état avant même de
       * rediriger — `router.replace('/(app)/(tabs)')` vise le groupe, pas un
       * onglet, et l'état restauré l'emporte.
       *
       * `user.id` plutôt que `me?.id` : il vient du magasin d'authentification
       * et est disponible immédiatement, alors que `me` arrive par le réseau —
       * une clé qui change après coup remonterait les onglets sous les yeux
       * de l'utilisateur.
       */
      key={user?.id ?? 'guest'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Boutique',
          href: hasShop ? '/(app)/(tabs)/shop' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'storefront' : 'storefront-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gp"
        options={{
          title: 'Voyages',
          href: hasGp ? '/(app)/(tabs)/gp' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'airplane' : 'airplane-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'chatbubble' : 'chatbubble-outline'}
                size={size}
                color={color}
              />
              {unread > 0 && (
                <View className="absolute -right-1.5 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                  <Text className="text-[9px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
