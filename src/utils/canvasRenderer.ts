import type { Student } from '../types';
import { loadImageElement } from './fileUtils';

const SERIF = '"Times New Roman", Times, "Liberation Serif", serif';

/** Upper bounds that keep the canvas within browser limits. */
const MAX_CARD_WIDTH = 1500;
const MAX_CANVAS_WIDTH = 8000;

const ROW_RATIO = 0.12; // height of each text row relative to card width

/** Below this card width the output will look soft when printed. */
export const LOW_RES_CARD_WIDTH = 300;

/**
 * Output card width: the largest size every photo can fill without upscaling.
 * All cards must be identical (guideline §3), so the smallest crop decides.
 */
export function outputCardWidth(students: Student[]): number {
  const n = students.length;
  const smallestCrop = Math.min(...students.map((s) => s.photo?.crop.width ?? Infinity));
  const canvasCap = Math.floor(MAX_CANVAS_WIDTH / n);
  return Math.max(1, Math.floor(Math.min(smallestCrop, MAX_CARD_WIDTH, canvasCap)));
}

/**
 * Renders the submission image following the guidelines:
 * - Identical 3:4 photos in form order
 * - Seamless side-by-side arrangement with a single thin dividing line (no gaps)
 * - Index number directly above the name in tight bordered rows
 * - Crisp serif typography, pure white text background
 */
export async function renderSubmission(students: Student[]): Promise<HTMLCanvasElement> {
  const images = await Promise.all(students.map((s) => loadImageElement(s.photo!.src)));

  const n = students.length;
  const cardW = outputCardWidth(students);
  const photoH = Math.round((cardW * 4) / 3);
  const rowH = Math.round(cardW * ROW_RATIO);
  const cardH = photoH + rowH * 2;
  const line = Math.max(1, Math.round(cardW / 450));

  const totalW = cardW * n;
  const totalH = cardH;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  // One font size per row type across all cards so text lines up perfectly
  const textMaxW = cardW - rowH * 0.4;
  const indexSize = fitFontSize(ctx, students.map((s) => s.indexNumber), rowH * 0.58, textMaxW);
  const nameSize = fitFontSize(ctx, students.map((s) => s.name.trim()), rowH * 0.52, textMaxW);

  // 1. Draw each student's photo and details
  students.forEach((s, i) => {
    const x = i * cardW;
    const c = s.photo!.crop;

    ctx.drawImage(images[i], c.x, c.y, c.width, c.height, x, 0, cardW, photoH);

    ctx.fillStyle = '#000000';
    drawCentered(ctx, s.indexNumber, `bold ${indexSize}px ${SERIF}`, x + cardW / 2, photoH + rowH / 2);
    drawCentered(ctx, s.name.trim(), `${nameSize}px ${SERIF}`, x + cardW / 2, photoH + rowH * 1.5);
  });

  // 2. Draw single thin divider lines between cards and rows (zero gaps)
  // Horizontal dividing line: Photo / Index Number
  hLine(ctx, 0, totalW, photoH, line);
  // Horizontal dividing line: Index Number / Name
  hLine(ctx, 0, totalW, photoH + rowH, line);

  // Vertical dividing lines between adjacent members
  for (let i = 1; i < n; i++) {
    const vx = i * cardW;
    vLine(ctx, vx, 0, totalH, line);
  }

  // Outer border around the entire combined submission
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = line;
  ctx.strokeRect(line / 2, line / 2, totalW - line, totalH - line);

  return canvas;
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  texts: string[],
  start: number,
  maxW: number
): number {
  let size = Math.floor(start);
  while (size > 6) {
    ctx.font = `${size}px ${SERIF}`;
    if (texts.every((t) => ctx.measureText(t).width <= maxW)) break;
    size--;
  }
  return size;
}

/** Centres text on its cap height so baselines match across cards. */
function drawCentered(ctx: CanvasRenderingContext2D, text: string, font: string, cx: number, cy: number) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const capH = ctx.measureText('H').actualBoundingBoxAscent;
  ctx.fillText(text, cx, Math.round(cy + capH / 2));
}

function hLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.lineWidth = w;
  ctx.strokeStyle = '#000000';
  ctx.stroke();
}

function vLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.lineWidth = w;
  ctx.strokeStyle = '#000000';
  ctx.stroke();
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encoding failed'))), 'image/jpeg', quality)
  );
}

export function submissionFilename(students: Student[], group: boolean): string {
  const id = students[0]?.indexNumber || 'submission';
  return group ? `FYP_Group_${id}.jpg` : `FYP_${id}.jpg`;
}
