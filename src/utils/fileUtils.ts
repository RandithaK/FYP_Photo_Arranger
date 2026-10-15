import heic2any from 'heic2any';

/**
 * Supported image extensions and MIME types
 */
export const SUPPORTED_EXTENSIONS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/gif',
  'image/svg+xml',
  'image/tiff',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.bmp',
  '.gif',
  '.svg',
  '.tif',
  '.tiff',
];

export interface LoadedImageInfo {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  fileName: string;
  fileType: string;
}

/**
 * Checks if a file is an Apple HEIC / HEIF image
 */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

/**
 * Processes an input file of any supported image type into a standard usable image
 */
export async function processInputImageFile(file: File): Promise<LoadedImageInfo> {
  let processedBlob: Blob = file;

  // If HEIC / HEIF, convert client-side using heic2any
  if (isHeicFile(file)) {
    try {
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      });
      processedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    } catch (err) {
      console.warn('heic2any conversion failed, falling back to original blob', err);
    }
  }

  const dataUrl = await blobToDataUrl(processedBlob);
  const dimensions = await getImageDimensions(dataUrl);

  return {
    dataUrl,
    blob: processedBlob,
    width: dimensions.width,
    height: dimensions.height,
    fileName: file.name,
    fileType: file.type || 'image/jpeg',
  };
}

/**
 * Converts a Blob to a base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads an image from a URL or Data URL and returns its dimensions
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Loads an HTMLImageElement
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Downloads a canvas or data URL as a high-quality JPEG file
 * Strict requirement: ONLY JPEG output!
 */
export function downloadCanvasAsJpeg(
  canvas: HTMLCanvasElement,
  filename: string,
  quality: number = 0.95
): void {
  // Enforce .jpg extension
  let safeName = filename.trim().replace(/\.[^/.]+$/, '');
  if (!safeName) safeName = 'FYP_Submission_Photo';
  const fullFilename = `${safeName}.jpg`;

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        console.error('Failed to generate image blob');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    'image/jpeg',
    quality
  );
}

/**
 * Copies a canvas image to the system clipboard (if supported by browser)
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      return false;
    }
    // Clipboard API for images typically accepts image/png blob
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(false);
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve(true);
        } catch (e) {
          console.warn('Clipboard write failed', e);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
}
