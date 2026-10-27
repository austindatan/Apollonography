/**
 * src/hooks/useImageUpload.ts
 *
 * Hook for initiating and monitoring image uploads.
 * Integrates with Windows FilePicker and background UploadQueue.
 */

import { useState, useCallback } from 'react';
import { pickImageFromComputer } from '../native/FilePicker';
import { enqueueUpload, triggerQueueProcessing } from '../services/uploadQueue';

export interface UseImageUploadResult {
  isUploading: boolean;
  error: string | null;
  pickAndUpload: (options: {
    entryId?: string;
    slot?: string;
    folder?: string;
    onLocalPreview?: (localUri: string) => void;
  }) => Promise<string | null>;
  enqueueManualUpload: (options: {
    entryId?: string;
    slot?: string;
    localUri: string;
    folder?: string;
  }) => Promise<string>;
}

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = useCallback(
    async (options: {
      entryId?: string;
      slot?: string;
      folder?: string;
      onLocalPreview?: (localUri: string) => void;
    }): Promise<string | null> => {
      setError(null);
      try {
        const picked = await pickImageFromComputer();
        if (!picked || !picked.uri) {
          return null;
        }

        // 1. Immediately provide local preview URI to the UI for zero delay
        if (options.onLocalPreview) {
          options.onLocalPreview(picked.uri);
        }

        // 2. Enqueue background upload to Cloudinary
        setIsUploading(true);
        await enqueueUpload({
          entryId: options.entryId,
          slot: options.slot,
          localTempPath: picked.uri,
          folder: options.folder,
        });

        return picked.uri;
      } catch (err: any) {
        const msg = err?.message || 'Failed to pick and enqueue image';
        console.warn('[useImageUpload]', msg);
        setError(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const enqueueManualUpload = useCallback(
    async (options: {
      entryId?: string;
      slot?: string;
      localUri: string;
      folder?: string;
    }): Promise<string> => {
      setError(null);
      setIsUploading(true);
      try {
        const id = await enqueueUpload({
          entryId: options.entryId,
          slot: options.slot,
          localTempPath: options.localUri,
          folder: options.folder,
        });
        triggerQueueProcessing();
        return id;
      } catch (err: any) {
        const msg = err?.message || 'Failed to enqueue image upload';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return {
    isUploading,
    error,
    pickAndUpload,
    enqueueManualUpload,
  };
}
