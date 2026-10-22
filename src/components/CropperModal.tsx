import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Student, CropData, StudentPhoto } from '../types';
import {
  detectFace,
  detectOptimalRotation,
  calculateHeadshotCrop,
  HEADSHOT_ASPECT,
} from '../utils/faceDetector';
import {
  loadImageElement,
  decomposeRotation,
  getRotatedDimensions,
  drawRotatedImageToCanvas,
  rotateImageToBlobUrl,
} from '../utils/fileUtils';
import { Check, X, Sparkles, RefreshCw, RotateCcw, RotateCw } from 'lucide-react';
import './CropperModal.css';

interface CropperModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSaveCrop: (studentId: string, updatedPhoto: StudentPhoto) => void;
}

export const CropperModal: React.FC<CropperModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaveCrop,
}) => {
  const photo = student.photo;
  const initialCrop = photo?.crop || { x: 0, y: 0, width: 300, height: 400 };
  const initialRot = photo?.rotation ?? 0;
  const initialDecomp = decomposeRotation(initialRot);

  const [crop, setCrop] = useState<CropData>(initialCrop);
  const [cardinalRot, setCardinalRot] = useState<0 | 90 | 180 | 270>(initialDecomp.cardinal);
  const [fineRot, setFineRot] = useState<number>(initialDecomp.fine);
  const [origImg, setOrigImg] = useState<HTMLImageElement | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialCrop: CropData }>({
    mouseX: 0,
    mouseY: 0,
    initialCrop,
  });
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);

  const totalRotation = Math.round((cardinalRot + fineRot) * 10) / 10;

  // Load the original unrotated image so any rotation adjustments stay crisp
  useEffect(() => {
    if (!photo) return;
    let active = true;
    const sourceUrl = photo.originalSrc || photo.src;
    loadImageElement(sourceUrl)
      .then((img) => {
        if (active) setOrigImg(img);
      })
      .catch((err) => console.error('Failed to load image in cropper', err));
    return () => {
      active = false;
    };
  }, [photo]);

  const currentDims = origImg
    ? getRotatedDimensions(origImg.naturalWidth, origImg.naturalHeight, totalRotation)
    : { width: photo?.width ?? 1, height: photo?.height ?? 1 };

  const origW = currentDims.width;
  const origH = currentDims.height;

  // Redraw preview canvas whenever original image or rotation changes
  useEffect(() => {
    if (!origImg || !previewCanvasRef.current) return;
    drawRotatedImageToCanvas(origImg, previewCanvasRef.current, totalRotation, 1200);
  }, [origImg, totalRotation]);

  // Clamp and preserve relative crop center when rotation changes dimensions
  const adjustCropForNewDimensions = useCallback(
    (newW: number, newH: number, prevW: number, prevH: number, prevCrop: CropData): CropData => {
      const relCx = (prevCrop.x + prevCrop.width / 2) / Math.max(1, prevW);
      const relCy = (prevCrop.y + prevCrop.height / 2) / Math.max(1, prevH);

      let cW = Math.min(prevCrop.width, newW, newH * HEADSHOT_ASPECT);
      cW = Math.max(60, cW);
      let cH = cW / HEADSHOT_ASPECT;
      if (cH > newH) {
        cH = newH;
        cW = cH * HEADSHOT_ASPECT;
      }

      const x = Math.max(0, Math.min(newW - cW, relCx * newW - cW / 2));
      const y = Math.max(0, Math.min(newH - cH, relCy * newH - cH / 2));

      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(cW),
        height: Math.round(cH),
      };
    },
    []
  );

  // Rotate by ±90° and automatically frame face in new orientation
  const handleRotateCardinal = async (delta: -90 | 90) => {
    if (!origImg) return;
    const nextCardinal = (((cardinalRot + delta) % 360) + 360) % 360 as 0 | 90 | 180 | 270;
    const nextTotal = nextCardinal + fineRot;
    const { width: nextW, height: nextH } = getRotatedDimensions(
      origImg.naturalWidth,
      origImg.naturalHeight,
      nextTotal
    );

    setCardinalRot(nextCardinal);

    if (previewCanvasRef.current) {
      const { scale } = drawRotatedImageToCanvas(
        origImg,
        previewCanvasRef.current,
        nextTotal,
        1200
      );
      try {
        const face = await detectFace(previewCanvasRef.current);
        if (face) {
          const scaledFace = {
            x: face.x / scale,
            y: face.y / scale,
            width: face.width / scale,
            height: face.height / scale,
            confidence: face.confidence,
          };
          setCrop(calculateHeadshotCrop(nextW, nextH, scaledFace));
          return;
        }
      } catch {
        // Fall back to adjusted crop below
      }
    }

    setCrop((prev) => adjustCropForNewDimensions(nextW, nextH, origW, origH, prev));
  };

  const handleFineRotationChange = (newFine: number) => {
    if (!origImg) {
      setFineRot(newFine);
      return;
    }
    const nextTotal = cardinalRot + newFine;
    const { width: nextW, height: nextH } = getRotatedDimensions(
      origImg.naturalWidth,
      origImg.naturalHeight,
      nextTotal
    );
    setFineRot(newFine);
    setCrop((prev) => adjustCropForNewDimensions(nextW, nextH, origW, origH, prev));
  };

  // Handle AI Auto-Center & Level
  const handleAutoCenter = async () => {
    if (!origImg || !previewCanvasRef.current) return;
    setIsDetecting(true);
    try {
      const optimalRot = await detectOptimalRotation(origImg);
      const { cardinal, fine } = decomposeRotation(optimalRot);
      setCardinalRot(cardinal);
      setFineRot(fine);

      const { fullWidth, fullHeight, scale } = drawRotatedImageToCanvas(
        origImg,
        previewCanvasRef.current,
        optimalRot,
        1200
      );

      const face = await detectFace(previewCanvasRef.current);
      const scaledFace = face
        ? {
            x: face.x / scale,
            y: face.y / scale,
            width: face.width / scale,
            height: face.height / scale,
            confidence: face.confidence,
          }
        : null;
      const newCrop = calculateHeadshotCrop(fullWidth, fullHeight, scaledFace);
      setCrop(newCrop);
    } catch (e) {
      console.warn('Face detection error', e);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleReset = () => {
    if (!photo) return;
    const decomp = decomposeRotation(photo.rotation ?? 0);
    setCardinalRot(decomp.cardinal);
    setFineRot(decomp.fine);
    setCrop(photo.crop);
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragMode(mode);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialCrop: { ...crop },
    };
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode || !previewCanvasRef.current) return;

      const rect = previewCanvasRef.current.getBoundingClientRect();
      const scaleX = origW / rect.width;
      const scaleY = origH / rect.height;

      const deltaX = (e.clientX - dragStartRef.current.mouseX) * scaleX;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) * scaleY;
      const init = dragStartRef.current.initialCrop;

      if (dragMode === 'move') {
        let newX = init.x + deltaX;
        let newY = init.y + deltaY;

        newX = Math.max(0, Math.min(origW - init.width, newX));
        newY = Math.max(0, Math.min(origH - init.height, newY));

        setCrop({
          ...init,
          x: Math.round(newX),
          y: Math.round(newY),
        });
      } else {
        // Corner resizing locked to 3:4 portrait aspect ratio
        let newW = init.width;
        let newH = init.height;
        let newX = init.x;
        let newY = init.y;

        if (dragMode === 'se') {
          newW = Math.max(60, init.width + deltaX);
          newH = newW / HEADSHOT_ASPECT;
          if (newX + newW > origW) {
            newW = origW - newX;
            newH = newW / HEADSHOT_ASPECT;
          }
          if (newY + newH > origH) {
            newH = origH - newY;
            newW = newH * HEADSHOT_ASPECT;
          }
        } else if (dragMode === 'nw') {
          const change = -deltaX;
          newW = Math.max(60, init.width + change);
          newH = newW / HEADSHOT_ASPECT;
          newX = init.x + (init.width - newW);
          newY = init.y + (init.height - newH);

          if (newX < 0) {
            newX = 0;
            newW = init.x + init.width;
            newH = newW / HEADSHOT_ASPECT;
            newY = init.y + init.height - newH;
          }
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.height;
            newW = newH * HEADSHOT_ASPECT;
            newX = init.x + init.width - newW;
          }
        } else if (dragMode === 'ne') {
          newW = Math.max(60, init.width + deltaX);
          newH = newW / HEADSHOT_ASPECT;
          newY = init.y + (init.height - newH);

          if (newX + newW > origW) {
            newW = origW - newX;
            newH = newW / HEADSHOT_ASPECT;
            newY = init.y + init.height - newH;
          }
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.height;
            newW = newH * HEADSHOT_ASPECT;
          }
        } else if (dragMode === 'sw') {
          const change = -deltaX;
          newW = Math.max(60, init.width + change);
          newH = newW / HEADSHOT_ASPECT;
          newX = init.x + (init.width - newW);

          if (newX < 0) {
            newX = 0;
            newW = init.x + init.width;
            newH = newW / HEADSHOT_ASPECT;
          }
          if (newY + newH > origH) {
            newH = origH - newY;
            newW = newH * HEADSHOT_ASPECT;
            newX = init.x + init.width - newW;
          }
        }

        setCrop({
          x: Math.round(Math.max(0, newX)),
          y: Math.round(Math.max(0, newY)),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      }
    },
    [dragMode, origW, origH]
  );

  const handlePointerUp = () => {
    setDragMode(null);
  };

  const handleSave = async () => {
    if (!photo) return;
    setIsSaving(true);
    try {
      const originalSrc = photo.originalSrc || photo.src;
      const prevRot = photo.rotation ?? 0;
      const rotationChanged = Math.abs(totalRotation - prevRot) >= 0.05;

      if (!rotationChanged || !origImg) {
        onSaveCrop(student.id, {
          ...photo,
          crop,
        });
      } else if (Math.abs(totalRotation) < 0.05) {
        onSaveCrop(student.id, {
          ...photo,
          src: originalSrc,
          originalSrc,
          width: origImg.naturalWidth,
          height: origImg.naturalHeight,
          crop,
          rotation: 0,
        });
      } else {
        const rotated = await rotateImageToBlobUrl(origImg, totalRotation);
        onSaveCrop(student.id, {
          ...photo,
          src: rotated.src,
          originalSrc,
          width: rotated.width,
          height: rotated.height,
          crop,
          rotation: totalRotation,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save rotated crop', err);
      alert('Failed to apply rotation.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !photo) return null;

  const cropLeftPct = (crop.x / origW) * 100;
  const cropTopPct = (crop.y / origH) * 100;
  const cropWidthPct = (crop.width / origW) * 100;
  const cropHeightPct = (crop.height / origH) * 100;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="cropper-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cropper-modal-header">
          <div>
            <h3>Adjust Headshot Framing & Rotation</h3>
            <span className="cropper-modal-subtitle">
              {student.name || student.indexNumber || 'Student'} · Aspect Ratio: 3:4 Headshot
            </span>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Stage */}
        <div
          className="cropper-stage"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="cropper-image-wrapper">
            <canvas
              ref={previewCanvasRef}
              className="cropper-source-img"
            />

            {/* Crop Overlay Box */}
            <div
              className="cropper-frame"
              style={{
                left: `${cropLeftPct}%`,
                top: `${cropTopPct}%`,
                width: `${cropWidthPct}%`,
                height: `${cropHeightPct}%`,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
            >
              {/* Headshot Framing Overlay Guides */}
              <div className="cropper-guide-oval" title="Position face within oval"></div>
              <div className="cropper-guide-eye-line" title="Eye level">
                <span>Eye level</span>
              </div>

              {/* Corner Handles */}
              <div className="handle handle-nw" onPointerDown={(e) => handlePointerDown(e, 'nw')} />
              <div className="handle handle-ne" onPointerDown={(e) => handlePointerDown(e, 'ne')} />
              <div className="handle handle-sw" onPointerDown={(e) => handlePointerDown(e, 'sw')} />
              <div className="handle handle-se" onPointerDown={(e) => handlePointerDown(e, 'se')} />
            </div>
          </div>
        </div>

        {/* Manual Rotation Controls Bar */}
        <div className="cropper-rotation-bar">
          <div className="rotation-quick-btns">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleRotateCardinal(-90)}
              disabled={!origImg || isDetecting || isSaving}
              title="Rotate 90° Counter-Clockwise"
            >
              <RotateCcw size={14} />
              <span>90° Left</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleRotateCardinal(90)}
              disabled={!origImg || isDetecting || isSaving}
              title="Rotate 90° Clockwise"
            >
              <RotateCw size={14} />
              <span>90° Right</span>
            </button>
          </div>

          <div className="rotation-slider-group">
            <label htmlFor="fine-rotation-slider" className="rotation-slider-label">
              <span>Straighten:</span>
              <strong className="rotation-angle-badge">
                {fineRot > 0 ? `+${fineRot.toFixed(1)}°` : `${fineRot.toFixed(1)}°`}
              </strong>
            </label>
            <input
              id="fine-rotation-slider"
              type="range"
              min="-30"
              max="30"
              step="0.5"
              value={fineRot}
              onChange={(e) => handleFineRotationChange(parseFloat(e.target.value))}
              className="rotation-range-input"
              disabled={!origImg || isDetecting || isSaving}
            />
            {fineRot !== 0 && (
              <button
                type="button"
                className="btn-zero-angle"
                onClick={() => handleFineRotationChange(0)}
                title="Reset fine tilt to 0°"
              >
                0°
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="cropper-modal-footer">
          <div className="footer-left">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAutoCenter}
              disabled={isDetecting || isSaving}
            >
              <Sparkles size={15} />
              <span>{isDetecting ? 'Detecting Face...' : 'AI Auto-Level & Center'}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReset}
              disabled={isSaving}
              title="Reset to uploaded state"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          </div>

          <div className="footer-right">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check size={16} />
              <span>{isSaving ? 'Applying...' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
