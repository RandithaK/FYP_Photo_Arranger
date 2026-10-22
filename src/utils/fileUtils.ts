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

/**
 * Decomposes any clockwise rotation angle into a nearest 90° cardinal step
 * (0, 90, 180, or 270) plus a fine tilt angle in [-45, +45] degrees.
 */
export function decomposeRotation(totalDegrees: number): {
  cardinal: 0 | 90 | 180 | 270;
  fine: number;
} {
  const nearest90 = Math.round(totalDegrees / 90) * 90;
  const cardinal = (((nearest90 % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const fine = Math.round((totalDegrees - nearest90) * 10) / 10;
  return { cardinal, fine };
}

/**
 * Computes the largest inscribed axis-aligned canvas dimensions for an image
 * of size (origW, origH) rotated by totalDegrees, ensuring zero empty corners
 * and 1:1 native pixel scale.
 */
export function getRotatedDimensions(
  origW: number,
  origH: number,
  totalDegrees: number
): { width: number; height: number } {
  const { cardinal, fine } = decomposeRotation(totalDegrees);
  const swapped = cardinal === 90 || cardinal === 270;
  const baseW = swapped ? origH : origW;
  const baseH = swapped ? origW : origH;

  if (Math.abs(fine) < 0.05) {
    return { width: baseW, height: baseH };
  }

  const rad = (Math.abs(fine) * Math.PI) / 180;
  const aspectMax = Math.max(baseW / baseH, baseH / baseW);
  const inscribedScale = Math.cos(rad) + Math.sin(rad) * aspectMax;

  return {
    width: Math.max(1, Math.floor(baseW / inscribedScale)),
    height: Math.max(1, Math.floor(baseH / inscribedScale)),
  };
}

/**
 * Draws `img` rotated by `totalDegrees` clockwise onto `canvas`.
 * If `maxDimension` is given, downscales proportionally for fast interactive preview.
 */
export function drawRotatedImageToCanvas(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  totalDegrees: number,
  maxDimension?: number
): { fullWidth: number; fullHeight: number; scale: number } {
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;
  const { width: fullWidth, height: fullHeight } = getRotatedDimensions(origW, origH, totalDegrees);

  let scale = 1;
  if (maxDimension && Math.max(fullWidth, fullHeight) > maxDimension) {
    scale = maxDimension / Math.max(fullWidth, fullHeight);
  }

  const outW = Math.max(1, Math.round(fullWidth * scale));
  const outH = Math.max(1, Math.round(fullHeight * scale));

  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((totalDegrees * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -origW / 2, -origH / 2);
    ctx.restore();
  }

  return { fullWidth, fullHeight, scale };
}

/**
 * Renders `img` rotated by `totalDegrees` at full native resolution into a Blob URL
 * and returns the decoded HTMLImageElement.
 */
export async function rotateImageToBlobUrl(
  img: HTMLImageElement,
  totalDegrees: number
): Promise<{ src: string; width: number; height: number; img: HTMLImageElement }> {
  const canvas = document.createElement('canvas');
  const { fullWidth, fullHeight } = drawRotatedImageToCanvas(img, canvas, totalDegrees);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode rotated image'))),
      'image/jpeg',
      0.96
    );
  });

  const src = URL.createObjectURL(blob);
  const rotatedImg = await loadImageElement(src);
  return { src, width: fullWidth, height: fullHeight, img: rotatedImg };
}
