export function safeFilename(input: string): string {
  const base = (input || 'file')
    .trim()
    .replace(/[\s]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  // Prevent empty / dot-only names.
  const cleaned = base.replace(/^\.+/, '');
  return cleaned.length ? cleaned.slice(0, 160) : 'file';
}

