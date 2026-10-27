/**
 * src/services/cloudinaryService.ts
 *
 * Cloudinary Direct Upload Service.
 * Performs zero-server unsigned multipart/form-data uploads directly to Cloudinary.
 */

import { CLOUDINARY_CONFIG, isCloudinaryConfigured } from '../config/cloudinary';

export interface CloudinaryUploadResult {
  publicId: string;
  version: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
  folder: string;
  secureUrl: string;
}

export interface UploadOptions {
  localUri: string;
  folder?: string;
  filename?: string;
  tags?: string[];
}

/**
 * Uploads an image file directly to Cloudinary using unsigned upload preset.
 * If credentials are placeholders or network is unavailable, returns a structured error or mock simulation.
 */
export async function uploadToCloudinary(options: UploadOptions): Promise<CloudinaryUploadResult> {
  const { localUri, folder = CLOUDINARY_CONFIG.folder, filename = 'upload.jpg', tags = [] } = options;

  // If using placeholder credentials, simulate successful upload for local testing & development
  if (!isCloudinaryConfigured()) {
    console.info('[Cloudinary] Using placeholder credentials. Simulating offline direct upload response.');
    const simulatedId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      publicId: `${folder}/${simulatedId}`,
      version: 1,
      width: 1024,
      height: 1024,
      format: 'png',
      bytes: 250000,
      folder,
      secureUrl: localUri,
    };
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: filename,
  } as any);

  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }
  if (tags && tags.length > 0) {
    formData.append('tags', tags.join(','));
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    publicId: data.public_id,
    version: data.version,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    folder: data.folder ?? folder,
    secureUrl: data.secure_url,
  };
}
