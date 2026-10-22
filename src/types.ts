export type ProjectType = 'group' | 'individual';

/** Crop rectangle in source-image pixels (always 3:4). */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionBox extends CropData {
  confidence?: number;
}

export interface StudentPhoto {
  /** Object URL of the oriented/rotated image (HEIC already converted) */
  src: string;
  /** Object URL of the original unrotated image, preserved for lossless re-rotation */
  originalSrc?: string;
  width: number;
  height: number;
  crop: CropData;
  /** Total clockwise rotation in degrees applied to originalSrc */
  rotation?: number;
  /** True when orientation/tilt was automatically corrected on upload */
  autoRotated?: boolean;
  /** False when no face was detected and the crop is just a centred guess */
  faceFound: boolean;
}

export interface Student {
  id: string;
  indexNumber: string;
  name: string;
  photo: StudentPhoto | null;
}
