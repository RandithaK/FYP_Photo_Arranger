import React, { useState, useRef, useCallback } from 'react';
import type { Student, CropData } from '../types';
import { detectFace, calculateHeadshotCrop, HEADSHOT_ASPECT } from '../utils/faceDetector';
import { Check, X, Sparkles, RefreshCw } from 'lucide-react';
import './CropperModal.css';

interface CropperModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSaveCrop: (studentId: string, crop: CropData) => void;
}

export const CropperModal: React.FC<CropperModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaveCrop,
}) => {
  const photo = student.photo;
  const initialCrop = photo?.crop || { x: 0, y: 0, width: 300, height: 400 };

  const [crop, setCrop] = useState<CropData>(initialCrop);
  const [isDetecting, setIsDetecting] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialCrop: CropData }>({
    mouseX: 0,
    mouseY: 0,
    initialCrop,
  });
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);

  const origW = photo?.width ?? 1;
  const origH = photo?.height ?? 1;

  // Handle AI Auto-Center
  const handleAutoCenter = async () => {
    if (!imgRef.current) return;
    setIsDetecting(true);
    try {
      const face = await detectFace(imgRef.current);
      const newCrop = calculateHeadshotCrop(origW, origH, face);
      setCrop(newCrop);
    } catch (e) {
      console.warn('Face detection error', e);
    } finally {
      setIsDetecting(false);
    }
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
      if (!dragMode || !imgRef.current) return;

      const rect = imgRef.current.getBoundingClientRect();
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

  const handleSave = () => {
    onSaveCrop(student.id, crop);
    onClose();
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
            <h3>Adjust Headshot Framing</h3>
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
            <img
              ref={imgRef}
              src={photo.src}
              alt="Crop target"
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

        {/* Footer */}
        <div className="cropper-modal-footer">
          <div className="footer-left">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAutoCenter}
              disabled={isDetecting}
            >
              <Sparkles size={15} />
              <span>{isDetecting ? 'Detecting Face...' : 'AI Auto-Center'}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCrop(photo.crop)}
              title="Reset to uploaded crop"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          </div>

          <div className="footer-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <Check size={16} />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
