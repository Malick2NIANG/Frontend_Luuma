/**
 * Distinction image / vidéo dans une galerie de produit.
 *
 * Déduite du SUFFIXE du fichier, et non d'un champ en base. Le serveur nomme
 * lui-même les fichiers depuis leur type MIME déclaré à la signature
 * (`MIME_EXTENSIONS` dans storage.constants.ts) : un `.mp4` ne peut donc pas
 * être une image déguisée. Ajouter une colonne de type au schéma aurait
 * demandé une migration et une double écriture, pour une information déjà
 * portée par le nom.
 */

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];

export type MediaKind = 'image' | 'video';

export interface MediaItem {
  uri: string;
  kind: MediaKind;
}

export function isVideo(uri: string): boolean {
  // On coupe la chaîne de requête : une URL présignée porte sa signature
  // après le « ? », et « .mp4?X-Amz-… » ne finit pas par « .mp4 ».
  const path = uri.split('?')[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension));
}

export function toMediaItems(uris: string[]): MediaItem[] {
  return uris.map((uri) => ({ uri, kind: isVideo(uri) ? 'video' : 'image' }));
}

/**
 * Première image de la liste, pour une vignette.
 *
 * Une vidéo ne peut pas servir d'aperçu statique — il faudrait en extraire
 * une image, ce qui suppose un traitement côté serveur. Tant qu'il n'existe
 * pas, on cherche la première vraie image ; à défaut, l'appelant affiche un
 * gabarit.
 */
export function firstImage(uris: string[]): string | undefined {
  return uris.find((uri) => !isVideo(uri));
}
