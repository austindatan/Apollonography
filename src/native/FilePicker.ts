/**
 * src/native/FilePicker.ts
 * Opens the native Windows File Picker filtered to image files (.png, .jpg, .jpeg, .webp),
 * copies the selected file into the app's images/ data directory with a unique filename,
 * and returns the copied file URI.
 */

import { NativeModules, Platform } from 'react-native';
import { sha256Base64 } from '../utils/crypto';

const { FilePickerModule } = NativeModules;

export interface PickedImageResult {
  uri: string;
  localPath: string;
  base64?: string;
  hash?: string;
  size?: number;
}

/**
 * Invokes native Windows file explorer dialog.
 * Copies chosen file to the app's local images directory and returns its URI.
 * Returns null if user cancelled the dialog.
 */
export async function pickImageFromComputer(): Promise<PickedImageResult | null> {
  try {
    const pickerModule = NativeModules.FilePickerModule;
    if (pickerModule && typeof pickerModule.pickAndCopyImage === 'function') {
      const raw: string = await pickerModule.pickAndCopyImage('');
      if (!raw || raw.trim() === '') {
        return null;
      }

      let destPath = raw;
      let base64 = '';
      try {
        const parsed = JSON.parse(raw);
        if (parsed.destPath) destPath = parsed.destPath;
        if (parsed.base64) base64 = parsed.base64;
      } catch {
        destPath = raw;
      }

      const formattedUri = destPath.startsWith('file:///')
        ? destPath
        : `file:///${destPath.replace(/\\/g, '/')}`;

      let hash: string | undefined;
      let size: number | undefined;
      if (base64) {
        try {
          hash = sha256Base64(base64);
          const cleanB64 = base64.replace(/^data:[^;]+;base64,/, '');
          size = Math.floor(cleanB64.length * 0.75);
        } catch {}
      }

      return {
        uri: formattedUri,
        localPath: destPath,
        base64: base64 || formattedUri,
        hash,
        size,
      };
    } else {
      console.warn('[FilePicker] FilePickerModule is not registered in NativeModules');
    }
  } catch (error) {
    console.warn('[FilePicker] Native module call failed:', error);
  }

  return null;
}
