/**
 * src/utils/nodeFs.ts
 *
 * Safe dynamic accessors for Node.js built-in modules ('fs', 'path') in Jest and desktop environments.
 * Prevents React Native's Metro bundler from statically extracting and failing on
 * 'path' and 'fs' dependencies during client-side JavaScript bundling.
 */

function getDynamicModule(modName: string): any {
  try {
    // eval('require') accesses module-scoped require in Jest/Node
    // while completely shielding from Metro's static AST CallExpression extractor
    const req = typeof eval !== 'undefined' ? eval('require') : null;
    if (typeof req === 'function') {
      return req(modName);
    }
  } catch {
    return null;
  }
  return null;
}

export function getFs(): any {
  return getDynamicModule('fs');
}

export function getPath(): any {
  return getDynamicModule('path');
}

/**
 * Cross-platform path joiner that uses Node.js path when available and pure JS fallback otherwise.
 */
export function joinPaths(...parts: (string | undefined | null)[]): string {
  const p = getPath();
  const validParts = parts.filter((part): part is string => Boolean(part));
  if (p && typeof p.join === 'function') {
    return p.join(...validParts);
  }
  return validParts.join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Cross-platform dirname that uses Node.js path when available and pure JS fallback otherwise.
 */
export function getDirname(filePath: string): string {
  const p = getPath();
  if (p && typeof p.dirname === 'function') {
    return p.dirname(filePath);
  }
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  return normalized.substring(0, lastSlash);
}
