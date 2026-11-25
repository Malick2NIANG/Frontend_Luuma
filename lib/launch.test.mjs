// Tests de la décision de lancement. Lancer : npm test
// (Node 22 exécute directement le TypeScript de lib/launch.ts.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lancementDeLApp } from './launch.ts';

const premier = { chemin: '/', typeNavigation: 'navigate', dejaJoue: false };

test("vrai lancement sur l'accueil : animation complète", () => {
  assert.equal(lancementDeLApp(premier), 'complet');
});

test('type de navigation inconnu (application native) : complet', () => {
  assert.equal(lancementDeLApp({ ...premier, typeNavigation: null }), 'complet');
});

test('chemin vide ou avec paramètres : toujours l’accueil', () => {
  assert.equal(lancementDeLApp({ ...premier, chemin: '' }), 'complet');
  assert.equal(lancementDeLApp({ ...premier, chemin: '/?utm=wa' }), 'complet');
  assert.equal(lancementDeLApp({ ...premier, chemin: '/#top' }), 'complet');
});

test('déjà joué pendant la session : rapide', () => {
  assert.equal(lancementDeLApp({ ...premier, dejaJoue: true }), 'rapide');
});

test('rechargement de la page : rapide', () => {
  assert.equal(lancementDeLApp({ ...premier, typeNavigation: 'reload' }), 'rapide');
});

test('bouton retour / avant : rapide', () => {
  assert.equal(
    lancementDeLApp({ ...premier, typeNavigation: 'back_forward' }),
    'rapide',
  );
});

test('lien partagé vers un produit : rapide', () => {
  assert.equal(
    lancementDeLApp({ ...premier, chemin: '/products/cmtn4q4hr' }),
    'rapide',
  );
});

test('retour de paiement : rapide', () => {
  assert.equal(
    lancementDeLApp({ ...premier, chemin: '/orders/123?paid=1' }),
    'rapide',
  );
});

test('« /accueil » n’est pas « / »', () => {
  assert.equal(lancementDeLApp({ ...premier, chemin: '/accueil' }), 'rapide');
});
