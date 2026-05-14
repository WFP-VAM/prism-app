/**
 * Presigned URLs are often cross-origin; the ``download`` attribute on a raw
 * link is ignored. Fetch as blob, then save with the chosen filename.
 * S3 bucket CORS must allow GET from this app origin.
 */
export async function downloadBlobFromSignedUrl(
  url: string,
  filename: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'omit',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Download failed (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
