import type { FaceDetector } from '@mediapipe/tasks-vision';
import type { CropData, FaceDetectionBox, StudentPhoto } from '../types';
import { drawRotatedImageToCanvas, rotateImageToBlobUrl } from './fileUtils';

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

export { getDetector };

export interface DetectedFaceLandmarks {
  box: FaceDetectionBox;
  keypoints: { x: number; y: number }[];
}

export async function detectFacesWithLandmarks(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<DetectedFaceLandmarks[]> {
  try {
    const detector = await getDetector();
    const result = detector.detect(source);
    return result.detections
      .filter((d) => d.boundingBox)
      .map((d) => ({
        box: {
          x: d.boundingBox!.originX,
          y: d.boundingBox!.originY,
          width: d.boundingBox!.width,
          height: d.boundingBox!.height,
          confidence: d.categories[0]?.score ?? 0,
        },
        keypoints: (d.keypoints || []).map((kp) => ({ x: kp.x, y: kp.y })),
      }));
  } catch (err) {
    console.warn('Face landmark detection failed', err);
    return [];
  }
}

/** Start loading the model early so the first upload feels instant. */
export function preloadFaceDetector(): void {
  getDetector().catch((e) => console.warn('Face detector failed to load', e));
}

type Source = HTMLImageElement | HTMLCanvasElement;

function detectInWithLandmarks(detector: FaceDetector, source: Source): DetectedFaceLandmarks[] {
  const result = detector.detect(source);
  return result.detections
    .filter((d) => d.boundingBox)
    .map((d) => ({
      box: {
        x: d.boundingBox!.originX,
        y: d.boundingBox!.originY,
        width: d.boundingBox!.width,
        height: d.boundingBox!.height,
        confidence: d.categories[0]?.score ?? 0,
      },
      keypoints: (d.keypoints || []).map((kp) => ({ x: kp.x, y: kp.y })),
    }));
}

/**
 * Scores a face detection primarily by confidence (cubed so high-confidence real faces
 * always beat larger low-confidence false positives like logos/seals), with a gentle
 * size tie-breaker for when multiple real people appear in the same photo.
 */
function scoreDetection(box: FaceDetectionBox, imgArea: number, anatomyScore = 1): number {
  const conf = box.confidence ?? 0.5;
  const areaRatio = Math.max(0.001, (box.width * box.height) / Math.max(1, imgArea));
  return Math.pow(conf, 3) * Math.pow(areaRatio, 0.15) * anatomyScore;
}

function bestFaceWithLandmarks(
  faces: DetectedFaceLandmarks[],
  W = 1,
  H = 1
): DetectedFaceLandmarks | null {
  if (faces.length === 0) return null;
  const imgArea = W * H;
  return faces.reduce((a, b) => {
    const evalA = evaluateFaceOrientation(a, W, H);
    const evalB = evaluateFaceOrientation(b, W, H);
    const scoreA = scoreDetection(a.box, imgArea, evalA.isUpright ? evalA.anatomyScore : 0.1);
    const scoreB = scoreDetection(b.box, imgArea, evalB.isUpright ? evalB.anatomyScore : 0.1);
    return scoreB > scoreA ? b : a;
  });
}

/**
 * Multi-scale face + landmark detection on an image or canvas of dimensions (W, H).
 * Continues scanning smaller windows unless a high-confidence (>= 0.85) face is already found,
 * preventing large low-confidence background emblems/seals from masking a smaller real face.
 */
function detectBestFaceWithLandmarksInSource(
  detector: FaceDetector,
  source: Source,
  W: number,
  H: number
): DetectedFaceLandmarks | null {
  const allFound: DetectedFaceLandmarks[] = [...detectInWithLandmarks(detector, source)];
  const bestDirect = bestFaceWithLandmarks(allFound, W, H);
  if (bestDirect && (bestDirect.box.confidence ?? 0) >= 0.85) {
    const { isUpright } = evaluateFaceOrientation(bestDirect, W, H);
    if (isUpright) return bestDirect;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return bestDirect;

  for (const factor of [0.6, 0.35]) {
    const size = Math.round(Math.min(W, H) * factor);
    if (size < 32) continue;
    const step = Math.round(size / 2);
    const tile = Math.min(size, 512);
    canvas.width = tile;
    canvas.height = tile;
    const scale = size / tile;

    for (let y = 0; y + size <= H + step / 2; y += step) {
      for (let x = 0; x + size <= W + step / 2; x += step) {
        const sx = Math.min(x, W - size);
        const sy = Math.min(y, H - size);
        ctx.clearRect(0, 0, tile, tile);
        ctx.drawImage(source, sx, sy, size, size, 0, 0, tile, tile);
        for (const f of detectInWithLandmarks(detector, canvas)) {
          allFound.push({
            box: {
              x: sx + f.box.x * scale,
              y: sy + f.box.y * scale,
              width: f.box.width * scale,
              height: f.box.height * scale,
              confidence: f.box.confidence,
            },
            keypoints: f.keypoints.map((kp) => ({
              x: (sx + kp.x * size) / W,
              y: (sy + kp.y * size) / H,
            })),
          });
        }
      }
    }

    const currentBest = bestFaceWithLandmarks(allFound, W, H);
    if (currentBest && (currentBest.box.confidence ?? 0) >= 0.85) {
      const { isUpright } = evaluateFaceOrientation(currentBest, W, H);
      if (isUpright) break;
    }
  }

  return bestFaceWithLandmarks(allFound, W, H);
}

/**
 * Evaluates whether a detected face's keypoints are anatomically upright
 * (right eye to the left of left eye, nose below eyes, mouth below nose)
 * and returns the eye-line tilt angle in degrees.
 */
function evaluateFaceOrientation(
  face: DetectedFaceLandmarks,
  W: number,
  H: number
): { isUpright: boolean; eyeAngleDeg: number; anatomyScore: number } {
  const kps = face.keypoints;
  if (!kps || kps.length < 2) {
    return { isUpright: true, eyeAngleDeg: 0, anatomyScore: 0.5 };
  }

  const p0 = { x: kps[0].x * W, y: kps[0].y * H }; // Right eye (left side of upright image)
  const p1 = { x: kps[1].x * W, y: kps[1].y * H }; // Left eye (right side of upright image)
  const eyeAngleDeg = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);

  const midEyeX = (p0.x + p1.x) / 2;
  const midEyeY = (p0.y + p1.y) / 2;
  const eyeDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const eyeRatio = eyeDist / Math.max(1, face.box.width);

  const nose = kps[2] ? { x: kps[2].x * W, y: kps[2].y * H } : null;
  const mouth = kps[3] ? { x: kps[3].x * W, y: kps[3].y * H } : null;

  // Check anatomical ordering: eyes -> nose -> mouth vertically
  const noseBelowEyes = nose ? nose.y > midEyeY : true;
  const mouthBelowNose = mouth && nose ? mouth.y > nose.y : mouth ? mouth.y > midEyeY : true;
  const validEyeSpacing = eyeRatio >= 0.18 && eyeRatio <= 0.75;

  // Check horizontal symmetry of nose/mouth relative to eye midpoint
  let symmetryScore = 1;
  if (nose && eyeDist > 0) {
    const noseOffset = Math.abs(nose.x - midEyeX) / eyeDist;
    symmetryScore = Math.max(0.2, 1 - noseOffset * 0.5);
  }

  const isUpright =
    Math.abs(eyeAngleDeg) <= 45 && noseBelowEyes && mouthBelowNose && validEyeSpacing;

  return {
    isUpright,
    eyeAngleDeg,
    anatomyScore: isUpright ? symmetryScore : 0,
  };
}

/**
 * Automatically determines the optimal clockwise rotation (cardinal 90°/180°/270°
 * plus fine head-tilt leveling) so the subject's face is upright and level.
 */
export async function detectOptimalRotation(img: HTMLImageElement): Promise<number> {
  try {
    const detector = await getDetector();
    const W = img.naturalWidth;
    const H = img.naturalHeight;

    // 1. Fast path ONLY if a very high-confidence upright face is detected directly
    // on the full un-tiled frame at 0° (avoids false positives on small sub-tile logos/emblems)
    const direct0 = bestFaceWithLandmarks(detectInWithLandmarks(detector, img), W, H);
    if (direct0 && (direct0.box.confidence ?? 0) >= 0.88) {
      const { isUpright, eyeAngleDeg, anatomyScore } = evaluateFaceOrientation(direct0, W, H);
      if (isUpright && anatomyScore >= 0.7) {
        if (Math.abs(eyeAngleDeg) >= 2.0 && Math.abs(eyeAngleDeg) <= 35) {
          return -Math.round(eyeAngleDeg * 2) / 2;
        }
        return 0;
      }
    }

    // 2. Probe all 4 cardinal orientations [0, 90, 180, 270] at equal resolution (up to 1200px)
    // so small or upside-down/sideways faces are compared on a level playing field
    const scratch = document.createElement('canvas');
    const candidates: {
      cardinal: 0 | 90 | 180 | 270;
      score: number;
      eyeAngleDeg: number;
    }[] = [];

    for (const cardinal of [0, 90, 180, 270] as const) {
      drawRotatedImageToCanvas(img, scratch, cardinal, 1200);
      const sW = scratch.width;
      const sH = scratch.height;
      const detected = detectBestFaceWithLandmarksInSource(detector, scratch, sW, sH);
      if (detected) {
        const { isUpright, eyeAngleDeg, anatomyScore } = evaluateFaceOrientation(
          detected,
          sW,
          sH
        );
        if (isUpright) {
          // Slight tie-breaker bonus (1.02) for 0° only when confidences are nearly identical
          const tieBreaker = cardinal === 0 ? 1.02 : 1.0;
          candidates.push({
            cardinal,
            score: scoreDetection(detected.box, sW * sH, anatomyScore) * tieBreaker,
            eyeAngleDeg,
          });
        }
      }
    }

    if (candidates.length === 0) return 0;

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const fineTilt =
      Math.abs(best.eyeAngleDeg) >= 2.0 && Math.abs(best.eyeAngleDeg) <= 35
        ? -Math.round(best.eyeAngleDeg * 2) / 2
        : 0;

    return best.cardinal + fineTilt;
  } catch (err) {
    console.warn('Auto rotation detection failed', err);
    return 0;
  }
}

/**
 * Runs automatic orientation + tilt correction on an uploaded image and computes
 * the optimal 3:4 headshot crop on the oriented image.
 */
export async function autoOrientAndFramePhoto(
  originalImg: HTMLImageElement,
  originalSrc: string
): Promise<StudentPhoto> {
  const rotation = await detectOptimalRotation(originalImg);
  const needsRotation = Math.abs(rotation) >= 1.5;

  let workingSrc = originalSrc;
  let workingImg = originalImg;
  let W = originalImg.naturalWidth;
  let H = originalImg.naturalHeight;

  if (needsRotation) {
    const rotated = await rotateImageToBlobUrl(originalImg, rotation);
    workingSrc = rotated.src;
    workingImg = rotated.img;
    W = rotated.width;
    H = rotated.height;
  }

  const face = await detectFace(workingImg).catch(() => null);
  const crop = calculateHeadshotCrop(W, H, face);

  return {
    src: workingSrc,
    originalSrc,
    width: W,
    height: H,
    crop,
    rotation: needsRotation ? rotation : 0,
    autoRotated: needsRotation,
    faceFound: Boolean(face),
  };
}

/**
 * Detects the main face in an image. Returns null if no face is found.
 *
 * The short-range BlazeFace model expects reasonably large faces, so if nothing
 * is found on the whole image we scan overlapping square windows (multi-scale)
 * to catch smaller faces in half-body / full-body shots.
 */
export async function detectFace(
  img: HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionBox | null> {
  const detector = await getDetector();
  const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const best = detectBestFaceWithLandmarksInSource(detector, img, W, H);
  return best ? best.box : null;
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
): CropData {
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
export function centeredCrop(imgW: number, imgH: number): CropData {
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

function roundCrop(c: CropData): CropData {
  return {
    x: Math.round(c.x),
    y: Math.round(c.y),
    width: Math.round(c.width),
    height: Math.round(c.height),
  };
}
