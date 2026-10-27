/**
 * src/config/cloudinary.ts
 *
 * Cloudinary configuration for Apollonography.
 * Uses 100% serverless unsigned upload presets.
 * Replace placeholder values with your real Cloud Name & Upload Preset
 * from the Cloudinary Console (Settings -> Upload -> Upload Presets).
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  folder: string;
  maxFileSize: number; // in bytes (e.g., 10MB)
  allowedFormats: string[];
}

export const CLOUDINARY_CONFIG: CloudinaryConfig = {
  // Placeholder credentials - update in Cloudinary Console settings
  cloudName: 'apollo-reverie',
  uploadPreset: 'apollonography_unsigned',
  folder: 'apollonography',
  maxFileSize: 10 * 1024 * 1024, // 10 MB limit
  allowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
};

/**
 * Returns true if the user has replaced placeholder credentials with their real cloud name.
 */
export function isCloudinaryConfigured(): boolean {
  return (
    CLOUDINARY_CONFIG.cloudName !== 'apollonography-vault' &&
    CLOUDINARY_CONFIG.cloudName.trim().length > 0 &&
    CLOUDINARY_CONFIG.uploadPreset.trim().length > 0
  );
}
