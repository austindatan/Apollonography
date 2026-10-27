/**
 * src/types/images.ts
 *
 * Unified polymorphic image type system for Apollonography.
 * Seamlessly handles:
 * - Bundled local assets: require('../../assets/images/...')
 * - Staged/cached local disk URIs: file:///.../images/pending/abc.png
 * - Remote Cloudinary assets: { public_id, version, format, width, height, bytes }
 */

export interface CloudinaryAssetRef {
  public_id: string;
  version: number;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export type ImageSource =
  | { kind: 'bundled'; asset: any }
  | { kind: 'local'; uri: string; localPath?: string }
  | { kind: 'cloudinary'; asset: CloudinaryAssetRef; alt?: string; uri?: string };

/**
 * Normalizes any image value into a strongly-typed ImageSource object.
 */
export function resolveImageSource(raw: any): ImageSource {
  if (!raw) {
    return { kind: 'bundled', asset: null };
  }
  // React Native numeric asset ID from require(...)
  if (typeof raw === 'number') {
    return { kind: 'bundled', asset: raw };
  }
  // Already a typed ImageSource or resolver object with kind
  if (typeof raw === 'object' && raw.kind) {
    if (raw.kind === 'cloudinary') {
      const pubId = raw.asset?.public_id || raw.public_id || raw.publicId || raw.id;
      return {
        kind: 'cloudinary',
        asset: {
          public_id: pubId || '',
          version: raw.asset?.version ?? raw.version ?? 0,
          format: raw.asset?.format ?? raw.format ?? 'png',
          width: raw.asset?.width ?? raw.width ?? 0,
          height: raw.asset?.height ?? raw.height ?? 0,
          bytes: raw.asset?.bytes ?? raw.bytes ?? 0,
        },
        uri: raw.uri,
      };
    }
    return raw as ImageSource;
  }
  // React Native style { uri: '...' } object
  if (typeof raw === 'object' && raw.uri) {
    return { kind: 'local', uri: raw.uri };
  }
  // Structured Cloudinary asset reference object
  if (typeof raw === 'object' && (raw.public_id || raw.publicId)) {
    return {
      kind: 'cloudinary',
      asset: {
        public_id: raw.public_id || raw.publicId,
        version: raw.version ?? 0,
        format: raw.format ?? 'png',
        width: raw.width ?? 0,
        height: raw.height ?? 0,
        bytes: raw.bytes ?? 0,
      },
    };
  }
  // String URI, Cloudinary public ID, or local file path
  if (typeof raw === 'string') {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return { kind: 'local', uri: raw };
    }
    if (raw.includes('apollonography/')) {
      const url = `https://res.cloudinary.com/apollo-reverie/image/upload/f_auto,q_auto/${raw}`;
      return {
        kind: 'cloudinary',
        asset: {
          public_id: raw,
          version: 0,
          format: 'png',
          width: 0,
          height: 0,
          bytes: 0,
        },
        uri: url,
      };
    }
    const formattedUri = raw.startsWith('file:///') ? raw : `file:///${raw.replace(/\\/g, '/')}`;
    return { kind: 'local', uri: formattedUri, localPath: raw };
  }
  // Fallback for asset objects or require descriptors
  return { kind: 'bundled', asset: raw };
}
