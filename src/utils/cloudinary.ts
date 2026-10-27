/**
 * src/utils/cloudinary.ts
 *
 * Cloudinary URL generator and asset formatting utilities.
 */

import { CLOUDINARY_CONFIG } from '../config/cloudinary';
import { CloudinaryAssetRef } from '../types/images';

export interface CloudinaryUrlOptions {
  width?: number;
  height?: number;
  crop?: 'limit' | 'fill' | 'scale' | 'thumb';
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}

/**
 * Builds an optimized Cloudinary delivery URL from a CloudinaryAssetRef.
 */
export function getCloudinaryUrl(
  asset: Pick<CloudinaryAssetRef, 'public_id'> & Partial<Pick<CloudinaryAssetRef, 'version' | 'format'>> | null | undefined,
  options: CloudinaryUrlOptions = {}
): string {
  if (!asset || !asset.public_id) return '';
  const { width, height, crop = 'limit', quality = 'auto', format = 'auto' } = options;
  const cloudName = CLOUDINARY_CONFIG.cloudName;

  const transforms: string[] = [];
  if (format === 'auto') transforms.push('f_auto');
  else if (format) transforms.push(`f_${format}`);

  if (quality === 'auto') transforms.push('q_auto');
  else if (typeof quality === 'number') transforms.push(`q_${quality}`);

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformSegment = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  const versionSegment = asset.version ? `v${asset.version}/` : '';
  const ext = asset.format && asset.format !== 'auto' ? `.${asset.format}` : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformSegment}${versionSegment}${asset.public_id}${ext}`;
}
