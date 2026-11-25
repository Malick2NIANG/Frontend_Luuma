/*
 * Service worker de Luuma (version web installable).
 *
 * Volontairement minimal : il rend l'application INSTALLABLE (icône sur le
 * bureau, fenêtre à part), sans rien mettre en cache. Un cache hors ligne mal
 * maîtrisé servirait des prix et des stocks périmés — pire qu'une erreur
 * réseau franche. Toutes les requêtes partent donc vers le réseau, comme sans
 * service worker.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
