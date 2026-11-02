import axios from 'axios';

/**
 * Message lisible tiré d'une erreur d'API.
 *
 * Notre filtre `AllExceptionsFilter` renvoie toujours
 * `{ statusCode, message, timestamp }` où `message` vaut
 * `exception.getResponse()`. Or NestJS emballe DÉJÀ la sienne : passer une
 * chaîne à `ForbiddenException` produit `{ statusCode, message, error }`.
 * Le texte se retrouve donc systématiquement d'un cran plus bas :
 *
 *   throw new ForbiddenException('Code incorrect.')
 *     → { message: { statusCode: 403, message: "Code incorrect.", … } }
 *
 *   throw new ForbiddenException({ code: 'X', message: 'Code incorrect.' })
 *     → { message: { code: 'X', message: "Code incorrect." } }
 *
 *   class-validator (400)
 *     → { message: { message: ["Le code comporte 6 chiffres.", …] } }
 *
 * Plusieurs hooks testaient `typeof body.message === 'string'` — vrai chez
 * NestJS nu, faux derrière notre filtre. Résultat : AUCUN message de nos
 * routes n'arrivait à l'écran, et les phrases les plus utiles — « 2 essais
 * restants », « Réessayez dans 40 secondes » — étaient remplacées par « Une
 * erreur est survenue ». D'où la descente récursive ci-dessous plutôt qu'un
 * test sur un seul niveau.
 *
 * Le tableau de `class-validator` porte un message par contrainte violée. On
 * prend le premier : les afficher tous donnerait une liste illisible sous un
 * champ.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;

  if (!error.response) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
  }

  const message = (error.response.data as { message?: unknown } | undefined)
    ?.message;

  return readMessage(message) ?? fallback;
}

/** Code machine du serveur, quand il en porte un — pour brancher, pas afficher. */
export function apiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;

  const data = error.response?.data as
    | { code?: unknown; message?: unknown }
    | undefined;

  if (typeof data?.code === 'string') return data.code;

  const nested = data?.message;
  if (nested && typeof nested === 'object' && 'code' in nested) {
    const code = (nested as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }

  return null;
}

function readMessage(message: unknown): string | null {
  if (typeof message === 'string' && message.length > 0) return message;

  if (Array.isArray(message)) {
    const first = message.find((m) => typeof m === 'string' && m.length > 0);
    return typeof first === 'string' ? first : null;
  }

  if (message && typeof message === 'object' && 'message' in message) {
    return readMessage((message as { message?: unknown }).message);
  }

  return null;
}
