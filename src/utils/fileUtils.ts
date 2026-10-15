/** File input accept string: anything the browser can decode, plus HEIC/HEIF. */
export const IMAGE_ACCEPT = 'image/*,.heic,.heif';

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

/**
 * Decodes any supported input (JPG, PNG, WebP, GIF, BMP, AVIF, HEIC/HEIF, …)
 * into a browser-usable image. EXIF orientation is applied by the browser.
 */
export async function loadPhotoFile(file: File): Promise<{ src: string; img: HTMLImageElement }> {
  let blob: Blob = file;

  if (isHeic(file)) {
    // Loaded on demand: the HEIC decoder is large and rarely needed
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
    blob = Array.isArray(out) ? out[0] : out;
  } else if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Not an image file');
  }

  const src = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(src);
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Empty image');
    return { src, img };
  } catch (e) {
    URL.revokeObjectURL(src);
    throw e;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
