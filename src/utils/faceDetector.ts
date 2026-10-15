import type { FaceDetector } from '@mediapipe/tasks-vision';
import type { CropData, FaceDetectionBox } from '../types';
import { loadImageElement } from './fileUtils';

/** Crop rectangle in source-image pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Output headshot aspect ratio (width / height). */
export const HEADSHOT_ASPECT = 3 / 4;

const BASE = import.meta.env.BASE_URL;
let detectorPromise: Promise<FaceDetector> | null = null;

/** Lazily initialises the MediaPipe BlazeFace detector (served from our own origin). */
function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      // Loaded on demand so the ML runtime doesn't weigh down first paint
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe/wasm`);
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: `${BASE}models/blaze_face_short_range.tflite`,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      });
    })();
    // Allow a retry if initialisation failed (e.g. transient load error)
    detectorPromise.catch(() => {
      detectorPromise = null;
    });
  }
  return detectorPromise;
}

/** Start loading the model early so the first upload feels instant. */
export function preloadFaceDetector(): void {
  getDetector().catch((e) => console.warn('Face detector failed to load', e));
}

type Source = HTMLImageElement | HTMLCanvasElement;

function detectIn(detector: FaceDetector, source: Source): FaceDetectionBox[] {
  const result = detector.detect(source);
  return result.detections
    .filter((d) => d.boundingBox)
    .map((d) => ({
      x: d.boundingBox!.originX,
      y: d.boundingBox!.originY,
      width: d.boundingBox!.width,
      height: d.boundingBox!.height,
      confidence: d.categories[0]?.score ?? 0,
    }));
}

/** Picks the most prominent face: large and confident. */
function bestFace(faces: FaceDetectionBox[]): FaceDetectionBox | null {
  if (faces.length === 0) return null;
  return faces.reduce((a, b) =>
    b.width * b.height * (b.confidence ?? 1) > a.width * a.height * (a.confidence ?? 1) ? b : a
  );
}

/**
 * Detects the main face in an image. Returns null if no face is found.
 *
 * The short-range BlazeFace model expects reasonably large faces, so if nothing
 * is found on the whole image we scan overlapping square windows (multi-scale)
 * to catch smaller faces in half-body / full-body shots.
 */
export async function detectFace(img: HTMLImageElement): Promise<FaceDetectionBox | null> {
  const detector = await getDetector();
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const direct = bestFace(detectIn(detector, img));
  if (direct) return direct;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const found: FaceDetectionBox[] = [];
  for (const factor of [0.6, 0.35]) {
    const size = Math.round(Math.min(W, H) * factor);
    const step = Math.round(size / 2);
    // Work at a modest resolution: the model input is 128px anyway
    const tile = Math.min(size, 512);
    canvas.width = tile;
    canvas.height = tile;
    const scale = size / tile;

    for (let y = 0; y + size <= H + step / 2; y += step) {
      for (let x = 0; x + size <= W + step / 2; x += step) {
        const sx = Math.min(x, W - size);
        const sy = Math.min(y, H - size);
        ctx.clearRect(0, 0, tile, tile);
        ctx.drawImage(img, sx, sy, size, size, 0, 0, tile, tile);
        for (const f of detectIn(detector, canvas)) {
          found.push({
            x: sx + f.x * scale,
            y: sy + f.y * scale,
            width: f.width * scale,
            height: f.height * scale,
            confidence: f.confidence,
          });
        }
      }
    }
    if (found.length > 0) break;
  }
  return bestFace(found);
}

/**
 * Computes a professional 3:4 headshot crop around a detected face.
 *
 * BlazeFace boxes span roughly brow-to-chin. We size the crop at ~2.2x the face
 * height and place the face centre at mid-height, which leaves room for the
 * hair above and a little neck/shoulder below — matching the "correct" example
 * in the guidelines (face only, not upper body).
 */
export function calculateHeadshotCrop(
  imgW: number,
  imgH: number,
  face: FaceDetectionBox | null
): Rect {
  if (!face) return centeredCrop(imgW, imgH);

  const FACE_TO_CROP = 2.2;
  const FACE_CENTER_Y = 0.5; // face centre at 50% of crop height

  let cropH = face.height * FACE_TO_CROP;
  let cropW = cropH * HEADSHOT_ASPECT;

  // Shrink if the photo is too tight to fit the ideal framing
  const fit = Math.min(1, imgW / cropW, imgH / cropH);
  cropW *= fit;
  cropH *= fit;

  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  const x = clamp(cx - cropW / 2, 0, imgW - cropW);
  const y = clamp(cy - cropH * FACE_CENTER_Y, 0, imgH - cropH);

  return roundCrop({ x, y, width: cropW, height: cropH });
}

/** Largest 3:4 crop, horizontally centred and biased towards the top. */
export function centeredCrop(imgW: number, imgH: number): Rect {
  let w = imgW;
  let h = w / HEADSHOT_ASPECT;
  if (h > imgH) {
    h = imgH;
    w = h * HEADSHOT_ASPECT;
  }
  return roundCrop({ x: (imgW - w) / 2, y: (imgH - h) * 0.25, width: w, height: h });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function roundCrop(c: Rect): Rect {
  return {
    x: Math.round(c.x),
    y: Math.round(c.y),
    width: Math.round(c.width),
    height: Math.round(c.height),
  };
}

// --- Compatibility wrappers for the pre-wizard UI (removed in the UX redesign) ---

/** @deprecated use detectFace */
export async function detectFaceInImage(
  src: string | HTMLImageElement
): Promise<FaceDetectionBox | null> {
  const img = typeof src === 'string' ? await loadImageElement(src) : src;
  return detectFace(img).catch(() => null);
}

/** @deprecated use calculateHeadshotCrop */
export function calculateSmartCrop(
  imgW: number,
  imgH: number,
  face: FaceDetectionBox | null,
  _aspect?: number
): CropData {
  void _aspect;
  return { ...calculateHeadshotCrop(imgW, imgH, face), zoom: 1, rotation: 0, flipH: false, flipV: false };
}
