import type { CropData } from '../types';
import { loadImageElement } from './fileUtils';

export interface RenderCropOptions {
  targetWidth?: number;  // Desired output width in pixels (e.g. 600)
  targetHeight?: number; // Desired output height in pixels (e.g. 800)
  quality?: number;      // JPEG export quality (0.95 default)
}

/**
 * Executes the cropping operation onto an offscreen canvas and returns a high-resolution JPEG Data URL.
 */
export async function renderCroppedImage(
  imageSrc: string | HTMLImageElement,
  crop: CropData,
  options: RenderCropOptions = {}
): Promise<string> {
  const img = typeof imageSrc === 'string' ? await loadImageElement(imageSrc) : imageSrc;
  const targetW = options.targetWidth || 600;
  const targetH = options.targetHeight || 800;
  const quality = options.quality ?? 0.95;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain canvas 2D context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill white background in case of rotation edges
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);

  // Set up coordinate space centered on canvas
  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);

  // Apply rotation
  if (crop.rotation !== 0) {
    ctx.rotate((crop.rotation * Math.PI) / 180);
  }

  // Apply flips
  const scaleX = crop.flipH ? -1 : 1;
  const scaleY = crop.flipV ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // Apply zoom
  const zoomFactor = crop.zoom || 1.0;
  ctx.scale(zoomFactor, zoomFactor);

  // Draw source image crop rectangle onto destination
  // We want the region (crop.x, crop.y, crop.width, crop.height) to fill the canvas
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -targetW / 2,
    -targetH / 2,
    targetW,
    targetH
  );

  ctx.restore();

  // Return strictly as image/jpeg
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Generates an initial default crop for an image if face detection wasn't run
 */
export function getDefaultCrop(
  imgWidth: number,
  imgHeight: number,
  targetAspectRatio: number = 3 / 4
): CropData {
  let cropWidth = imgWidth;
  let cropHeight = cropWidth / targetAspectRatio;

  if (cropHeight > imgHeight) {
    cropHeight = imgHeight;
    cropWidth = cropHeight * targetAspectRatio;
  }

  const cropX = (imgWidth - cropWidth) / 2;
  const cropY = Math.max(0, (imgHeight - cropHeight) * 0.2); // upper-biased for headshot

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    zoom: 1.0,
    rotation: 0,
    flipH: false,
    flipV: false,
  };
}
