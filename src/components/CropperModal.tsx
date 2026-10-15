import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Student, CropData } from '../types';
import { calculateSmartCrop, detectFaceInImage } from '../utils/faceDetector';
import { renderCroppedImage } from '../utils/cropEngine';
import {
  RotateCw,
  RotateCcw,
  Sparkles,
  RefreshCw,
  FlipHorizontal,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Eye,
  Grid
} from 'lucide-react';
import './CropperModal.css';

interface CropperModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSaveCrop: (studentId: string, crop: CropData, croppedDataUrl: string) => void;
}

export const CropperModal: React.FC<CropperModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaveCrop,
}) => {
  const [crop, setCrop] = useState<CropData>(student.crop);
  const [showGuides, setShowGuides] = useState(true);
  const [showFaceBox, setShowFaceBox] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Interaction dragging states
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialCrop: CropData }>({
    mouseX: 0,
    mouseY: 0,
    initialCrop: student.crop,
  });

  const targetAspectRatio = 3 / 4; // 3:4 portrait

  // When natural image loads, set dimensions
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNaturalSize({ width: nw, height: nh });

    // If crop is empty or 0, initialize it
    if (!crop.width || !crop.height) {
      const initial = calculateSmartCrop(nw, nh, student.detectedFace || null, targetAspectRatio);
      setCrop(initial);
    }
  };

  // Generate live preview when crop changes
  useEffect(() => {
    let active = true;
    if (!student.originalImageUrl || naturalSize.width === 0 || !crop.width) return;

    const timeout = setTimeout(async () => {
      try {
        const rendered = await renderCroppedImage(student.originalImageUrl!, crop, {
          targetWidth: 300,
          targetHeight: 400,
          quality: 0.85,
        });
        if (active) setPreviewUrl(rendered);
      } catch (err) {
        console.error('Failed to render preview', err);
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [crop, student.originalImageUrl, naturalSize]);

  // Handle trigger AI smart crop
  const handleTriggerAiCrop = async () => {
    if (!student.originalImageUrl || naturalSize.width === 0) return;
    setIsProcessing(true);
    try {
      const face = await detectFaceInImage(student.originalImageUrl);
      const smartCrop = calculateSmartCrop(
        naturalSize.width,
        naturalSize.height,
        face,
        targetAspectRatio
      );
      setCrop(smartCrop);
    } catch (e) {
      console.error('Smart crop failed', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mouse / Touch handlers for manual dragging & resizing
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
      if (!dragMode || !imageRef.current) return;

      const imgEl = imageRef.current;
      const rect = imgEl.getBoundingClientRect();
      const scaleX = naturalSize.width / rect.width;
      const scaleY = naturalSize.height / rect.height;

      const deltaX = (e.clientX - dragStartRef.current.mouseX) * scaleX;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) * scaleY;
      const init = dragStartRef.current.initialCrop;

      if (dragMode === 'move') {
        let newX = init.x + deltaX;
        let newY = init.y + deltaY;

        // Clamp inside image
        newX = Math.max(0, Math.min(naturalSize.width - init.width, newX));
        newY = Math.max(0, Math.min(naturalSize.height - init.height, newY));

        setCrop((prev) => ({
          ...prev,
          x: Math.round(newX),
          y: Math.round(newY),
        }));
      } else {
        // Resizing corner while preserving aspect ratio
        let newW = init.width;
        let newH = init.height;
        let newX = init.x;
        let newY = init.y;

        if (dragMode === 'se') {
          newW = Math.max(50, init.width + deltaX);
          newH = newW / targetAspectRatio;
          if (newX + newW > naturalSize.width) {
            newW = naturalSize.width - newX;
            newH = newW / targetAspectRatio;
          }
          if (newY + newH > naturalSize.height) {
            newH = naturalSize.height - newY;
            newW = newH * targetAspectRatio;
          }
        } else if (dragMode === 'nw') {
          const change = -deltaX;
          newW = Math.max(50, init.width + change);
          newH = newW / targetAspectRatio;
          newX = init.x + (init.width - newW);
          newY = init.y + (init.height - newH);

          if (newX < 0) {
            newX = 0;
            newW = init.x + init.width;
            newH = newW / targetAspectRatio;
            newY = init.y + init.height - newH;
          }
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.height;
            newW = newH * targetAspectRatio;
            newX = init.x + init.width - newW;
          }
        } else if (dragMode === 'ne') {
          newW = Math.max(50, init.width + deltaX);
          newH = newW / targetAspectRatio;
          newY = init.y + (init.height - newH);

          if (newX + newW > naturalSize.width) {
            newW = naturalSize.width - newX;
            newH = newW / targetAspectRatio;
            newY = init.y + init.height - newH;
          }
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.height;
            newW = newH * targetAspectRatio;
          }
        } else if (dragMode === 'sw') {
          const change = -deltaX;
          newW = Math.max(50, init.width + change);
          newH = newW / targetAspectRatio;
          newX = init.x + (init.width - newW);

          if (newX < 0) {
            newX = 0;
            newW = init.x + init.width;
            newH = newW / targetAspectRatio;
          }
          if (newY + newH > naturalSize.height) {
            newH = naturalSize.height - newY;
            newW = newH * targetAspectRatio;
            newX = init.x + init.width - newW;
          }
        }

        setCrop((prev) => ({
          ...prev,
          x: Math.round(Math.max(0, newX)),
          y: Math.round(Math.max(0, newY)),
          width: Math.round(newW),
          height: Math.round(newH),
        }));
      }
    },
    [dragMode, naturalSize, targetAspectRatio]
  );

  const handlePointerUp = () => {
    setDragMode(null);
  };

  const handleSave = async () => {
    if (!student.originalImageUrl) return;
    setIsProcessing(true);
    try {
      const finalJpegDataUrl = await renderCroppedImage(student.originalImageUrl, crop, {
        targetWidth: 600,
        targetHeight: 800,
        quality: 0.95,
      });
      onSaveCrop(student.id, crop, finalJpegDataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to export cropped JPEG', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !student.originalImageUrl) return null;

  // Calculate percentages for overlay placement
  const cropLeftPct = naturalSize.width ? (crop.x / naturalSize.width) * 100 : 0;
  const cropTopPct = naturalSize.height ? (crop.y / naturalSize.height) * 100 : 0;
  const cropWidthPct = naturalSize.width ? (crop.width / naturalSize.width) * 100 : 100;
  const cropHeightPct = naturalSize.height ? (crop.height / naturalSize.height) * 100 : 100;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="cropper-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cropper-header">
          <div className="cropper-title-area">
            <h3>Intelligent Image Cropper & Headshot Framer</h3>
            <span className="cropper-subtitle">
              Adjust framing for: <strong>{student.name || student.indexNumber || 'Student'}</strong> (Strict 3:4 Portrait Ratio)
            </span>
          </div>
          <button className="icon-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cropper-body">
          {/* Main workspace with crop box */}
          <div
            className="cropper-stage-wrapper"
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="cropper-image-container">
              <img
                ref={imageRef}
                src={student.originalImageUrl}
                alt="Source preview"
                className="source-crop-image"
                onLoad={onImageLoad}
                style={{
                  transform: `rotate(${crop.rotation}deg) scale(${crop.flipH ? -1 : 1}, ${crop.flipV ? -1 : 1})`,
                }}
              />

              {/* Detected face highlight if available */}
              {showFaceBox && student.detectedFace && naturalSize.width > 0 && (
                <div
                  className="detected-face-box"
                  title="AI Detected Face Region"
                  style={{
                    left: `${(student.detectedFace.x / naturalSize.width) * 100}%`,
                    top: `${(student.detectedFace.y / naturalSize.height) * 100}%`,
                    width: `${(student.detectedFace.width / naturalSize.width) * 100}%`,
                    height: `${(student.detectedFace.height / naturalSize.height) * 100}%`,
                  }}
                >
                  <span className="face-label">Face</span>
                </div>
              )}

              {/* Darkened backdrop surrounding crop */}
              <div
                className="crop-box-outline"
                style={{
                  left: `${cropLeftPct}%`,
                  top: `${cropTopPct}%`,
                  width: `${cropWidthPct}%`,
                  height: `${cropHeightPct}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                {/* Visual Headshot framing guide */}
                {showGuides && (
                  <div className="headshot-guidelines">
                    <div className="head-oval-guide" title="Fit face/head inside this oval"></div>
                    <div className="eyes-guide-line" title="Eye level guide">
                      <span>Eye Level</span>
                    </div>
                    <div className="grid-overlay">
                      <div className="grid-v-1"></div>
                      <div className="grid-v-2"></div>
                      <div className="grid-h-1"></div>
                      <div className="grid-h-2"></div>
                    </div>
                  </div>
                )}

                {/* Resize corner handles */}
                <div
                  className="crop-handle handle-nw"
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                />
                <div
                  className="crop-handle handle-ne"
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                />
                <div
                  className="crop-handle handle-sw"
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                />
                <div
                  className="crop-handle handle-se"
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                />
              </div>
            </div>
          </div>

          {/* Sidebar with Live Preview and Controls */}
          <div className="cropper-sidebar">
            <div className="preview-section">
              <h4 className="sidebar-section-title">Result Card Preview</h4>
              <div className="spec-card-mockup">
                <div className="mockup-photo-box">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Cropped" className="mockup-img" />
                  ) : (
                    <div className="mockup-loading">Rendering...</div>
                  )}
                </div>
                <div className="mockup-details-box">
                  <div className="mockup-index">{student.indexNumber || '214001A'}</div>
                  <div className="mockup-name">{student.name || 'A.B.C. Perera'}</div>
                </div>
              </div>
              <p className="mockup-note">
                Output resolution: <strong>600 × 800 px</strong> (JPEG)
              </p>
            </div>

            {/* AI and Quick Adjustment Toolbar */}
            <div className="crop-controls-group">
              <h4 className="sidebar-section-title">Smart Tools</h4>
              <button
                type="button"
                className="action-btn ai-btn"
                onClick={handleTriggerAiCrop}
                disabled={isProcessing}
              >
                <Sparkles size={16} />
                <span>AI Auto-Center Face</span>
              </button>

              <div className="toggle-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showGuides}
                    onChange={(e) => setShowGuides(e.target.checked)}
                  />
                  <Eye size={14} />
                  <span>Headshot & Eye Guide</span>
                </label>
                {student.detectedFace && (
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showFaceBox}
                      onChange={(e) => setShowFaceBox(e.target.checked)}
                    />
                    <Grid size={14} />
                    <span>Show AI Face Box</span>
                  </label>
                )}
              </div>
            </div>

            {/* Transform Controls */}
            <div className="crop-controls-group">
              <h4 className="sidebar-section-title">Transform & Rotate</h4>
              <div className="btn-grid-row">
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setCrop((c) => ({ ...c, rotation: (c.rotation - 90 + 360) % 360 }))}
                  title="Rotate Left 90°"
                >
                  <RotateCcw size={16} />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setCrop((c) => ({ ...c, rotation: (c.rotation + 90) % 360 }))}
                  title="Rotate Right 90°"
                >
                  <RotateCw size={16} />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  className={`action-btn secondary-btn ${crop.flipH ? 'active' : ''}`}
                  onClick={() => setCrop((c) => ({ ...c, flipH: !c.flipH }))}
                  title="Flip Horizontally"
                >
                  <FlipHorizontal size={16} />
                  <span>Flip</span>
                </button>
              </div>

              {/* Fine zoom */}
              <div className="slider-control">
                <div className="slider-label-row">
                  <span>Zoom Level</span>
                  <span>{crop.zoom.toFixed(2)}x</span>
                </div>
                <div className="slider-row">
                  <ZoomOut size={14} />
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    value={crop.zoom}
                    onChange={(e) =>
                      setCrop((c) => ({ ...c, zoom: parseFloat(e.target.value) }))
                    }
                  />
                  <ZoomIn size={14} />
                </div>
              </div>
            </div>

            {/* Guideline reminder alert */}
            <div className="guideline-reminder">
              <strong>Requirement:</strong> Professional headshot showing only the face. No casual, selfie, or full-body photos.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cropper-footer">
          <button
            type="button"
            className="action-btn secondary-btn"
            onClick={() => {
              if (naturalSize.width > 0) {
                const initial = calculateSmartCrop(
                  naturalSize.width,
                  naturalSize.height,
                  null,
                  targetAspectRatio
                );
                setCrop(initial);
              }
            }}
          >
            <RefreshCw size={14} />
            <span>Reset Crop</span>
          </button>

          <div className="footer-right-actions">
            <button type="button" className="action-btn outline-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="action-btn primary-btn"
              onClick={handleSave}
              disabled={isProcessing}
            >
              <Check size={16} />
              <span>Apply & Save Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
