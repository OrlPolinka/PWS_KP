export const normalizeMediaUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  try {
    const url = new URL(value, 'https://localhost');
    if (
      url.pathname.startsWith('/uploads/') &&
      (!/^https?:\/\//i.test(value) || ['localhost', '127.0.0.1', '::1'].includes(url.hostname))
    ) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return value;
  }

  return value;
};

export const isUploadedMedia = (value: string): boolean =>
  normalizeMediaUrl(value)?.startsWith('/uploads/') === true;
