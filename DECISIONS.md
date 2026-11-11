# Luuma — Décisions du 10 novembre 2026

## Positionnement
« Jumia sénégalais » avec une différence : un même commerçant vend **au Sénégal** et **à la diaspora** depuis une seule boutique. Modèle hybride SaaS + marketplace. Luuma ne gère aucune logistique en propre : GP et livreurs sont des indépendants.

## Technique
- On reste sur **React Native / Expo**.
- On abandonne Flutter, Swift et Kotlin ; les dossiers `Frontend_Flutter`, `Frontend_Kotlin`, `Frontend_Swift` sont à supprimer.

## Deux parcours de commande, tous deux dès le lancement

### Sénégal
- Le client remplit son panier, paie ; l'argent est bloqué en séquestre.
- Une course de livraison est créée automatiquement, sur le **modèle Yango** :
  - offre envoyée aux livreurs proches, le premier qui accepte prend la course ;
  - **plusieurs boutiques à récupérer, puis un seul client**, pour un seul tarif ;
  - prix calculé par l'application selon la distance (tarif de base + prix au km) ;
  - suivi du livreur en direct ; contact par appel ou messagerie Luuma ;
  - confirmation de réception par un **code à 4 chiffres**, qui libère le séquestre ;
  - notation des livreurs.

### Diaspora
- Le client remplit **d'abord** son panier.
- L'application propose ensuite les GP partant vers sa ville à des dates compatibles, avec le prix du port.
- Le client choisit et paie en séquestre ; l'application met en relation commerçant et GP.
- Changement par rapport au code actuel : aujourd'hui, le client choisit le GP avant les produits.

## Rôles
Client, Commerçant, **GP**, **Livreur** (nouveau). Le livreur est l'équivalent local du GP : vérification d'identité, photos de preuve, paiement par séquestre. Il peut aussi apporter les colis des commerçants jusqu'au GP pour l'international.

## Géolocalisation (au cœur du système)
- Boutiques et adresses clients placées sur une carte (adresses souvent informelles à Dakar).
- Sert au calcul des prix, aux itinéraires, à la recherche des livreurs proches et au suivi en direct.
- Pistes techniques : PostGIS, `expo-location`, `react-native-maps`, OpenStreetMap + OSRM d'abord, Google Maps si besoin.

## Modèle économique (proposition, pas encore validée définitivement)
- **Commerçants** :
  - Essentiel (gratuit) : 10 produits, 8 % de commission ;
  - Pro (8 000 F/mois) : illimité, outils de gestion et rapports, 4 % de commission ;
  - option annuelle 80 000 F ; 3 mois de Pro offerts au lancement.
- **GP et livreurs** : 10 % de commission sur le prix du transport.
- **Client** : paie le prix affiché + la livraison, sans frais supplémentaires. La commission de 6 % actuellement ajoutée côté client passe côté commerçant.
- Ordre de grandeur pour 6 M FCFA/mois de chiffre d'affaires : ~300 commerçants Pro et ~1 400 commandes diaspora par mois, plus le volume local.

## Ordre de construction prévu
1. Paiement en séquestre.
2. Géolocalisation des boutiques et des adresses.
3. Commande locale + rôle Livreur.
4. Choix du GP après le panier.
5. Abonnements commerçants.

## Questions ouvertes
- Aucun compte Wave / Orange Money / Stripe pour l'instant : choisir et ouvrir un prestataire de paiement.
- Lancer sur une seule zone d'abord (ex. centre de Dakar) pour avoir assez de livreurs.
- Valider les taux de commission.
- Modifications non commitées en attente : authentification (frontend), `trustedOrigins` et `tsBuildInfoFile` (backend).
