import { withBasePath } from './basePath';
/**
 * Fetches an uploaded image and returns it as a PNG data URI for jsPDF.
 *
 * Two reasons this isn't just the URL:
 *  - LGU logos are stored as WebP (Sharp, 200x200) and jsPDF's addImage supports PNG/JPEG only.
 *  - jsPDF needs the bytes, not a remote reference.
 *
 * Drawing via an object URL (rather than pointing <img> at the remote URL) keeps the canvas
 * untainted, so toDataURL() won't throw a security error.
 *
 * Returns null on any failure — a missing seal must never block document generation.
 */
export async function fetchImageAsPngDataUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const url = withBasePath(path);

  let objectUrl: string | undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl!;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || 200;
    canvas.height = image.naturalHeight || 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
