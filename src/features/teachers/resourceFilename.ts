export function sanitizeResourceFilename(fileName: string): string {
  const normalized = fileName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const extensionIndex = normalized.lastIndexOf('.');
  const extensionCandidate = extensionIndex > 0 ? normalized.slice(extensionIndex).replace(/[^A-Za-z0-9.]/g, '').slice(-16).toLowerCase() : '';
  const extension = /^\.[a-z0-9]{1,15}$/.test(extensionCandidate) ? extensionCandidate : '';
  const stem = extension ? normalized.slice(0, extensionIndex) : normalized;
  const maxStemLength = Math.max(1, 150 - extension.length);
  const safeStem = stem.replace(/[^\w-]+/g, '_').replace(/^[._-]+/, '').slice(0, maxStemLength).replace(/[._-]+$/, '');
  return `${safeStem || 'resource'}${extension}`;
}
