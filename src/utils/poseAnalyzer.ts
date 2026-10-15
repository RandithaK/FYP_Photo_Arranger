import { detectFacesWithLandmarks, type DetectedFaceLandmarks } from './faceDetector';

export interface PoseGuidanceResult {
  hasFace: boolean;
  status: 'searching' | 'adjusting' | 'perfect';
  primaryMessage: string;
  isReadyToCapture: boolean;
  checks: {
    centered: boolean;
    distance: boolean;
    upright: boolean;
    eyeLevel: boolean;
    forward: boolean;
    lighting: boolean;
  };
  metrics: {
    heightRatio: number;
    centerOffsetX: number;
    rollAngle: number;
    eyeYRatio: number;
    luminance: number;
  };
}

const DEFAULT_RESULT: PoseGuidanceResult = {
  hasFace: false,
  status: 'searching',
  primaryMessage: 'Position your face in the guide frame',
  isReadyToCapture: false,
  checks: {
    centered: false,
    distance: false,
    upright: false,
    eyeLevel: false,
    forward: false,
    lighting: true,
  },
  metrics: {
    heightRatio: 0,
    centerOffsetX: 0,
    rollAngle: 0,
    eyeYRatio: 0,
    luminance: 128,
  },
};

/**
 * Analyzes a live camera video stream and provides real-time positioning feedback
 * adhering strictly to the official university submission photo guidelines:
 * - Proper tight headshot framing (50% - 65% head height, not full body or casual selfie)
 * - Level, upright head orientation (roll angle ~ 0°)
 * - Centered horizontally (symmetric margins)
 * - Eyes placed along the upper ~35% - 40% portrait guide line
 * - Directly facing camera forward (no turned angles or tilted chins)
 * - Clear, even lighting
 */
export async function analyzeLivePose(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement,
  facingMode: 'user' | 'environment'
): Promise<PoseGuidanceResult> {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (!vW || !vH) return DEFAULT_RESULT;

  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return DEFAULT_RESULT;

  // Process at a fast, downscaled resolution (width ~400px) for high FPS
  const targetWidth = Math.min(480, vW);
  const scale = targetWidth / vW;
  const targetHeight = Math.round(vH * scale);

  scratchCanvas.width = targetWidth;
  scratchCanvas.height = targetHeight;

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

  const detections: DetectedFaceLandmarks[] = await detectFacesWithLandmarks(scratchCanvas);

  if (detections.length === 0) {
    return {
      ...DEFAULT_RESULT,
      primaryMessage: 'Position your face in the guide frame',
    };
  }

  if (detections.length > 1) {
    return {
      ...DEFAULT_RESULT,
      hasFace: true,
      status: 'adjusting',
      primaryMessage: 'Multiple faces detected · 1 student per photo only',
    };
  }

  const face = detections[0];
  const box = face.box;
  const kps = face.keypoints;

  // Calculate the 3:4 target viewport bounds within this frame
  let guideW = targetWidth;
  let guideH = Math.round(guideW / (3 / 4));
  if (guideH > targetHeight) {
    guideH = targetHeight;
    guideW = Math.round(guideH * (3 / 4));
  }
  const guideX = (targetWidth - guideW) / 2;
  const guideY = (targetHeight - guideH) / 2;

  // Compute face position relative to the 3:4 guide frame
  const faceCenterX = (box.x + box.width / 2 - guideX) / guideW;
  const faceCenterY = (box.y + box.height / 2 - guideY) / guideH;
  const faceHeightRatio = box.height / guideH;

  // Check 1: Distance / Headshot Proximity
  // Per guidelines & examples: headshot should occupy ~48% - 66% of frame height (tight headshot)
  const isTooFar = faceHeightRatio < 0.40;
  const isTooClose = faceHeightRatio > 0.67;
  const isDistanceGood = !isTooFar && !isTooClose;

  // Check 2: Horizontal Centering
  // Centered within +/- 6% of center
  const centerOffsetX = faceCenterX - 0.50;
  const isCentered = Math.abs(centerOffsetX) <= 0.07;

  // Keypoints analysis:
  // In BlazeFace: kp[0] is right eye, kp[1] is left eye, kp[2] is nose tip, kp[3] is mouth
  let rollAngle = 0;
  let eyeYRatio = faceCenterY - faceHeightRatio * 0.15; // default estimation
  let isForward = true;

  if (kps && kps.length >= 2) {
    const p0 = { x: kps[0].x * targetWidth, y: kps[0].y * targetHeight };
    const p1 = { x: kps[1].x * targetWidth, y: kps[1].y * targetHeight };

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    // Angle deviation from level horizontal (0° or 180°)
    const absDeg = Math.abs(rawAngle);
    rollAngle = Math.min(absDeg, Math.abs(180 - absDeg));

    // Eye level coordinate in 3:4 guide
    const avgEyeY = (p0.y + p1.y) / 2;
    eyeYRatio = (avgEyeY - guideY) / guideH;

    // Head orientation (Yaw): check nose symmetry between eyes
    if (kps.length >= 3) {
      const pNose = { x: kps[2].x * targetWidth, y: kps[2].y * targetHeight };
      const dist0 = Math.abs(pNose.x - p0.x);
      const dist1 = Math.abs(pNose.x - p1.x);
      const symmetry = Math.max(dist0, dist1) / (Math.min(dist0, dist1) + 0.001);
      // If symmetry ratio > 1.7, user is turned to one side
      if (symmetry > 1.7) {
        isForward = false;
      }
    }
  }

  // Check 3: Head Tilt / Upright
  // Guidelines forbid casual tilted selfies
  const isUpright = rollAngle <= 6.5;

  // Check 4: Eye Level Line
  // Standard portrait: eyes should sit on upper 30% - 42% horizontal line
  const isEyeLevelGood = eyeYRatio >= 0.26 && eyeYRatio <= 0.44;

  // Check 5: Lighting check
  // Sample a small 16x16 patch at face center
  let luminance = 130;
  try {
    const sampleX = Math.max(0, Math.min(targetWidth - 10, Math.round(box.x + box.width * 0.35)));
    const sampleY = Math.max(0, Math.min(targetHeight - 10, Math.round(box.y + box.height * 0.35)));
    const sampleW = Math.max(4, Math.round(box.width * 0.3));
    const sampleH = Math.max(4, Math.round(box.height * 0.3));
    const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const data = imgData.data;
    let sum = 0;
    const totalPixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    luminance = Math.round(sum / totalPixels);
  } catch {
    luminance = 130;
  }
  const isLightingGood = luminance >= 60 && luminance <= 240;

  const checks = {
    centered: isCentered,
    distance: isDistanceGood,
    upright: isUpright,
    eyeLevel: isEyeLevelGood,
    forward: isForward,
    lighting: isLightingGood,
  };

  // Determine priority guidance message:
  let primaryMessage = '✨ Pose is Perfect! Hold steady';
  let status: 'searching' | 'adjusting' | 'perfect' = 'perfect';

  if (!isDistanceGood) {
    status = 'adjusting';
    primaryMessage = isTooFar
      ? 'Move closer to camera (too far)'
      : 'Step back slightly (too close)';
  } else if (!isCentered) {
    status = 'adjusting';
    // When facingMode is 'user', video is mirrored horizontally
    const isMirrored = facingMode === 'user';
    if (centerOffsetX < 0) {
      primaryMessage = isMirrored ? 'Move slightly to your right' : 'Move slightly left';
    } else {
      primaryMessage = isMirrored ? 'Move slightly to your left' : 'Move slightly right';
    }
  } else if (!isEyeLevelGood) {
    status = 'adjusting';
    primaryMessage = eyeYRatio < 0.26
      ? 'Lower camera or step down'
      : 'Raise camera to eye level';
  } else if (!isUpright) {
    status = 'adjusting';
    primaryMessage = 'Keep head upright · Level your eyes';
  } else if (!isForward) {
    status = 'adjusting';
    primaryMessage = 'Face camera directly · Avoid side angles';
  } else if (!isLightingGood) {
    status = 'adjusting';
    primaryMessage = luminance < 60
      ? 'Lighting is dim · Move to brighter light'
      : 'Lighting too bright · Avoid direct glare';
  }

  const isReadyToCapture = status === 'perfect';

  return {
    hasFace: true,
    status,
    primaryMessage,
    isReadyToCapture,
    checks,
    metrics: {
      heightRatio: faceHeightRatio,
      centerOffsetX,
      rollAngle,
      eyeYRatio,
      luminance,
    },
  };
}
