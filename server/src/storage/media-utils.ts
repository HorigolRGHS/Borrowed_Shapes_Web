export function getProxyMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;

  const r2Base =
    process.env.R2_PUBLIC_DEV_URL ||
    'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev';
  
  // Normalize base to remove trailing slash
  const normalizedBase = r2Base.replace(/\/+$/, '');

  let key = '';

  if (url.startsWith(normalizedBase)) {
    key = url.substring(normalizedBase.length).replace(/^\/+/, '');
  } else if (
    url.startsWith('reports/') || 
    url.startsWith('forums/') || 
    url.startsWith('achievement/') || 
    url.startsWith('categories/')
  ) {
    key = url;
  } else {
    // If it's a completely external URL (not ours)
    return url;
  }

  // We add a timestamp only if it's strictly necessary to bust cache.
  // Since media files (images, reports) usually have unique timestamps in their keys,
  // we do not aggressively cache-bust here like we do with avatars.
  return `/api/media/${key}`;
}
