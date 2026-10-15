import type { ProjectConfig, Student, LayoutOptions } from '../types';
import { loadImageElement } from './fileUtils';

export interface RenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Renders the entire submission image (Group or Individual) strictly following the PDF guidelines.
 * Returns an HTMLCanvasElement that can be displayed or exported to high-resolution JPEG.
 */
export async function renderCombinedCanvas(
  config: ProjectConfig,
  customScale: number = 2
): Promise<HTMLCanvasElement> {
  const { projectType, students, layout } = config;
  const scale = customScale || layout.outputScale || 2;

  // Filter students to render:
  // Individual project only takes the first student
  const activeStudents = projectType === 'individual'
    ? students.slice(0, 1)
    : students;

  const count = activeStudents.length;
  if (count === 0) {
    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = 400 * scale;
    emptyCanvas.height = 300 * scale;
    const ctx = emptyCanvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 400, 300);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('No students to render', 200, 150);
    return emptyCanvas;
  }

  // Preload all cropped images
  const loadedImages: Array<HTMLImageElement | null> = await Promise.all(
    activeStudents.map(async (s) => {
      const src = s.croppedImageUrl || s.originalImageUrl;
      if (!src) return null;
      try {
        return await loadImageElement(src);
      } catch (e) {
        console.warn('Failed to load image for canvas render', e);
        return null;
      }
    })
  );

  // Card dimensions (in unscaled CSS pixels)
  const cardW = layout.cardWidth || 360;
  const photoH = layout.photoHeight || 480; // 3:4 ratio = 360:480
  const indexH = layout.indexBoxHeight || 46;
  const nameH = layout.nameBoxHeight || 46;
  const cardH = photoH + indexH + nameH;

  const gap = layout.seamlessTouching ? 0 : (layout.gap ?? 12);
  const outerPad = layout.padding ?? (layout.seamlessTouching ? 0 : 20);
  const borderW = layout.borderWidth || 2;

  // Total canvas dimensions
  const totalW = outerPad * 2 + (cardW * count) + (gap * (count - 1));
  const totalH = outerPad * 2 + cardH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalW * scale);
  canvas.height = Math.round(totalH * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set high quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Scale context for retina / high-DPI rendering
  ctx.scale(scale, scale);

  // Background fill (pure white as required for academic submissions)
  ctx.fillStyle = layout.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  // Render each student card side-by-side
  for (let i = 0; i < count; i++) {
    const student = activeStudents[i];
    const img = loadedImages[i];
    const cardX = outerPad + i * (cardW + gap);
    const cardY = outerPad;

    renderStudentCard(ctx, student, img, cardX, cardY, cardW, photoH, indexH, nameH, borderW, layout);
  }

  return canvas;
}

/**
 * Draws a single student card with strict adherence to PDF requirements:
 * 1. Headshot photo box (black border)
 * 2. Index number box directly underneath (no extra space, crisp serif font)
 * 3. Horizontal line
 * 4. Name with initials box below index number
 */
function renderStudentCard(
  ctx: CanvasRenderingContext2D,
  student: Student,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  cardW: number,
  photoH: number,
  indexH: number,
  nameH: number,
  borderW: number,
  layout: LayoutOptions
): void {
  const fontFam = layout.fontFamily || '"Times New Roman", Times, Georgia, serif';
  const borderColor = layout.borderColor || '#000000';

  // 1. Draw Photo
  const photoY = y;
  if (img) {
    // Fill photo background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, photoY, cardW, photoH);

    // Draw image to fill cardW x photoH
    ctx.drawImage(img, x, photoY, cardW, photoH);
  } else {
    // Placeholder if no photo
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, photoY, cardW, photoH);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `italic 16px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Photo Pending', x + cardW / 2, photoY + photoH / 2);
  }

  // Border around photo
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderW;
  ctx.strokeRect(x, photoY, cardW, photoH);

  // 2. Draw Index Number Box
  const indexY = photoY + photoH;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, indexY, cardW, indexH);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderW;
  ctx.strokeRect(x, indexY, cardW, indexH);

  // Draw Index Number Text
  const indexText = student.indexNumber.trim() || 'INDEX NO';
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${layout.fontSizeIndex || 22}px ${fontFam}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Vertically centered inside index cell with zero extraneous margin
  ctx.fillText(indexText, x + cardW / 2, indexY + indexH / 2);

  // 3. Draw Student Name with Initials Box
  const nameY = indexY + indexH;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, nameY, cardW, nameH);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderW;
  ctx.strokeRect(x, nameY, cardW, nameH);

  // Draw Name Text (clean, formal, properly capitalized)
  const nameText = student.name.trim() || 'A.B.C. Student';
  ctx.fillStyle = '#000000';
  ctx.font = `normal ${layout.fontSizeName || 19}px ${fontFam}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameText, x + cardW / 2, nameY + nameH / 2);
}

/**
 * Exports the project directly as a high-quality JPEG Blob and Data URL.
 * Guarantees output is strictly JPEG format as requested!
 */
export async function exportProjectAsJpeg(
  config: ProjectConfig,
  quality: number = 0.98,
  scale: number = 2
): Promise<{ blob: Blob; dataUrl: string; filename: string }> {
  const canvas = await renderCombinedCanvas(config, scale);

  // Generate appropriate filename based on PDF guidelines
  let prefix = 'FYP';
  if (config.projectType === 'group') {
    const leader = config.students[0];
    const leaderIndex = leader ? leader.indexNumber.replace(/\s+/g, '') : 'Group';
    prefix = `FYP_Group_Photo_${leaderIndex}`;
  } else {
    const student = config.students[0];
    const studentIndex = student ? student.indexNumber.replace(/\s+/g, '') : 'Individual';
    prefix = `FYP_Photo_${studentIndex}`;
  }

  const filename = `${prefix}.jpg`;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return reject(new Error('Failed to create JPEG blob from canvas'));
        }
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ blob, dataUrl, filename });
      },
      'image/jpeg',
      quality
    );
  });
}
