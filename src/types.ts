export type ProjectType = 'group' | 'individual';

export interface CropData {
  x: number;       // Crop X percentage (0 - 100) or pixels in source image
  y: number;       // Crop Y percentage (0 - 100) or pixels in source image
  width: number;   // Crop width
  height: number;  // Crop height
  zoom: number;    // Zoom factor (1.0 to 3.0)
  rotation: number;// Rotation in degrees (0, 90, 180, 270 or fine)
  flipH: boolean;
  flipV: boolean;
}

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface Student {
  id: string;
  indexNumber: string; // e.g. "214001A" (no spaces allowed)
  name: string;        // e.g. "A.B.C. Perera"
  isLeader: boolean;   // First member in group project is Group Leader
  originalImageUrl: string | null;
  originalFileName?: string;
  originalFileType?: string;
  originalWidth?: number;
  originalHeight?: number;
  crop: CropData;
  croppedImageUrl: string | null;
  detectedFace?: FaceDetectionBox | null;
  isAiCropped: boolean;
}

export interface LayoutOptions {
  cardWidth: number;          // Target width per student card in px (e.g. 400)
  photoHeight: number;        // Target height for photo in px (e.g. 500, approx 4:5 or 3:4)
  indexBoxHeight: number;     // Height for index number cell in px (e.g. 50)
  nameBoxHeight: number;      // Height for name cell in px (e.g. 50)
  gap: number;                // Gap between student cards in px (0 for seamless touching as in PDF page 1, or 8-16 for separate)
  padding: number;            // Outer padding around entire canvas in px
  borderWidth: number;        // Border line thickness (e.g. 2px)
  borderColor: string;        // Border color (default '#000000')
  backgroundColor: string;    // Background color (default '#ffffff')
  fontFamily: string;         // 'Times New Roman, serif' | 'Georgia, serif' | 'Arial, sans-serif'
  fontSizeIndex: number;      // Font size for index number (e.g. 26)
  fontSizeName: number;       // Font size for name (e.g. 22)
  seamlessTouching: boolean;  // True for seamless touching cards (PDF page 1), False for separate bordered cards (PDF page 2)
  outputScale: number;        // 1x, 2x, 3x for ultra high-res print export
}

export interface ProjectConfig {
  projectType: ProjectType;
  projectTitle: string;
  batchOrYear: string;
  students: Student[];
  layout: LayoutOptions;
}

export interface ValidationItem {
  type: 'error' | 'warning' | 'success';
  field?: string;
  message: string;
}

export interface StudentValidation {
  studentId: string;
  hasPhoto: boolean;
  isHeadshotCropped: boolean;
  indexNumberValid: boolean;
  indexNumberHasNoSpaces: boolean;
  nameValid: boolean;
  issues: ValidationItem[];
}

export interface ProjectValidation {
  isValid: boolean;
  leaderSpecified: boolean;
  hasStudents: boolean;
  allPhotosUploaded: boolean;
  allDetailsFilled: boolean;
  studentValidations: Record<string, StudentValidation>;
  overallIssues: ValidationItem[];
}
