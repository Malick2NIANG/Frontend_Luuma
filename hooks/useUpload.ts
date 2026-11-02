import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

// Doit rester aligné sur STORAGE_CATEGORIES (Backend/src/storage/
// storage.constants.ts) : une catégorie inconnue du serveur est refusée à la
// signature, avant même le moindre octet envoyé.
export type UploadCategory =
  | 'product'
  | 'avatar'
  | 'kyc'
  | 'package'
  | 'voice'
  | 'chat'
  | 'story';

interface PresignResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  key: string;
  fileUrl: string | null;
  isPublic: boolean;
  expiresInSeconds: number;
}

export interface UploadResult {
  /** À transmettre à l'API métier (message vocal, KYC, photo de colis). */
  key: string;
  /** Renseignée uniquement pour les catégories publiques. */
  fileUrl: string | null;
}

/**
 * Envoi de fichier en deux temps : l'API signe une URL, le téléphone envoie
 * ses octets directement au stockage.
 *
 * Faire transiter un vocal ou une photo par le serveur applicatif doublerait
 * le trajet réseau — pénalisant depuis la diaspora comme depuis Dakar.
 */
export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (params: {
      uri: string;
      category: UploadCategory;
      contentType: string;
    }): Promise<UploadResult | null> => {
      setIsUploading(true);
      setError(null);

      try {
        // Le fichier local doit être lu avant la signature : sa taille est
        // exigée à la signature, et S3 la revérifie ensuite via la condition
        // content-length-range.
        const fileResponse = await fetch(params.uri);
        const blob = await fileResponse.blob();

        const { data: presigned } = await api.post<PresignResponse>(
          '/api/storage/presign-upload',
          {
            category: params.category,
            contentType: params.contentType,
            contentLength: blob.size,
          },
        );

        const putResponse = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          // Reproduire exactement les en-têtes signés : le moindre écart
          // invalide la signature et le stockage refuse l'envoi.
          headers: presigned.headers,
          body: blob,
        });

        if (!putResponse.ok) {
          throw new Error(`Échec de l'envoi (${putResponse.status})`);
        }

        return { key: presigned.key, fileUrl: presigned.fileUrl };
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "L'envoi du fichier a échoué.",
        );
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { upload, isUploading, error };
}
