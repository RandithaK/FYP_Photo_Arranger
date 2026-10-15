import type { Student, LayoutOptions } from '../types';

/**
 * Creates an elegant SVG formal portrait as a Data URL for instant demo testing
 */
export function createSamplePortraitSvg(
  bgColor: string,
  hairColor: string,
  suitColor: string,
  tieColor: string,
  faceTone: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="400" height="533">
    <!-- Studio Background -->
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="${bgColor}"/>
      </radialGradient>
      <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${suitColor}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="400" height="533" fill="url(#bgGrad)"/>
    
    <!-- Formal Suit / Shoulders -->
    <path d="M 60 533 L 130 380 Q 200 410 270 380 L 340 533 Z" fill="url(#suitGrad)"/>
    
    <!-- White Formal Shirt Collar -->
    <polygon points="170,380 200,430 230,380 200,360" fill="#ffffff"/>
    
    <!-- Tie -->
    <polygon points="195,385 205,385 210,480 200,500 190,480" fill="${tieColor}"/>
    
    <!-- Neck -->
    <rect x="180" y="310" width="40" height="70" rx="10" fill="${faceTone}"/>
    
    <!-- Face -->
    <ellipse cx="200" cy="240" rx="80" ry="105" fill="${faceTone}"/>
    
    <!-- Hair -->
    <path d="M 115 220 Q 110 130 200 125 Q 290 130 285 220 Q 285 160 200 150 Q 115 160 115 220 Z" fill="${hairColor}"/>
    
    <!-- Eyes -->
    <ellipse cx="170" cy="225" rx="10" ry="6" fill="#ffffff"/>
    <circle cx="170" cy="225" r="4" fill="#1e293b"/>
    <ellipse cx="230" cy="225" rx="10" ry="6" fill="#ffffff"/>
    <circle cx="230" cy="225" r="4" fill="#1e293b"/>
    
    <!-- Eyebrows -->
    <path d="M 155 210 Q 170 205 185 210" stroke="${hairColor}" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M 215 210 Q 230 205 245 210" stroke="${hairColor}" stroke-width="4" stroke-linecap="round" fill="none"/>
    
    <!-- Nose -->
    <path d="M 200 225 L 196 260 L 204 260" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.6"/>
    
    <!-- Friendly formal smile -->
    <path d="M 180 285 Q 200 302 220 285" stroke="#991b1b" stroke-width="3" stroke-linecap="round" fill="none"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_STUDENTS: Student[] = [
  {
    id: 's-1',
    indexNumber: '214001A',
    name: 'A.B.C. Perera',
    isLeader: true,
    originalImageUrl: createSamplePortraitSvg('#cbd5e1', '#334155', '#1e293b', '#b91c1c', '#fde047'),
    originalFileName: 'leader_perera.jpg',
    originalFileType: 'image/jpeg',
    crop: {
      x: 0,
      y: 0,
      width: 400,
      height: 533,
      zoom: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    croppedImageUrl: createSamplePortraitSvg('#cbd5e1', '#334155', '#1e293b', '#b91c1c', '#fde047'),
    isAiCropped: true,
  },
  {
    id: 's-2',
    indexNumber: '214002B',
    name: 'K.D. Silva',
    isLeader: false,
    originalImageUrl: createSamplePortraitSvg('#94a3b8', '#1e1b4b', '#1e3a8a', '#047857', '#fed7aa'),
    originalFileName: 'silva.png',
    originalFileType: 'image/png',
    crop: {
      x: 0,
      y: 0,
      width: 400,
      height: 533,
      zoom: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    croppedImageUrl: createSamplePortraitSvg('#94a3b8', '#1e1b4b', '#1e3a8a', '#047857', '#fed7aa'),
    isAiCropped: true,
  },
  {
    id: 's-3',
    indexNumber: '214003C',
    name: 'M.N. Fernando',
    isLeader: false,
    originalImageUrl: createSamplePortraitSvg('#e2e8f0', '#78350f', '#0f172a', '#6b21a8', '#fbcfe8'),
    originalFileName: 'fernando.webp',
    originalFileType: 'image/webp',
    crop: {
      x: 0,
      y: 0,
      width: 400,
      height: 533,
      zoom: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    croppedImageUrl: createSamplePortraitSvg('#e2e8f0', '#78350f', '#0f172a', '#6b21a8', '#fbcfe8'),
    isAiCropped: true,
  },
  {
    id: 's-4',
    indexNumber: '214004D',
    name: 'H.P. Jayasinghe',
    isLeader: false,
    originalImageUrl: createSamplePortraitSvg('#94a3b8', '#451a03', '#1e293b', '#c2410c', '#ffedd5'),
    originalFileName: 'jayasinghe.jpeg',
    originalFileType: 'image/jpeg',
    crop: {
      x: 0,
      y: 0,
      width: 400,
      height: 533,
      zoom: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    croppedImageUrl: createSamplePortraitSvg('#94a3b8', '#451a03', '#1e293b', '#c2410c', '#ffedd5'),
    isAiCropped: true,
  },
];

export const DEFAULT_LAYOUT: LayoutOptions = {
  cardWidth: 360,
  photoHeight: 480,       // 3:4 aspect ratio
  indexBoxHeight: 46,
  nameBoxHeight: 46,
  gap: 0,                 // 0 for seamless touching cards (as in PDF Page 1)
  padding: 0,             // 0 for seamless border bounds
  borderWidth: 2,
  borderColor: '#000000',
  backgroundColor: '#ffffff',
  fontFamily: '"Times New Roman", Times, Georgia, serif',
  fontSizeIndex: 22,
  fontSizeName: 19,
  seamlessTouching: true, // Page 1 style touching cards
  outputScale: 2,         // 2x high resolution
};
