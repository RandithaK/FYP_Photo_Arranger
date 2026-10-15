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
  /** Object URL of the decoded image (HEIC already converted) */
  src: string;
  width: number;
  height: number;
  crop: CropData;
  /** False when no face was detected and the crop is just a centred guess */
  faceFound: boolean;
}

export interface Student {
  id: string;
  indexNumber: string;
  name: string;
  photo: StudentPhoto | null;
}
