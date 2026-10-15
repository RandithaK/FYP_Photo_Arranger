import React, { useRef, useState } from 'react';
import type { Student, CropData } from '../types';
import { processInputImageFile } from '../utils/fileUtils';
import { detectFaceInImage, calculateSmartCrop } from '../utils/faceDetector';
import { renderCroppedImage } from '../utils/cropEngine';
import { sanitizeIndexNumber, formatStudentNameWithInitials, validateIndexNumber } from '../utils/validation';
import {
  Crop,
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Crown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import './StudentCard.css';

interface StudentCardProps {
  student: Student;
  index: number;
  totalStudents: number;
  isGroupProject: boolean;
  onUpdate: (updated: Student) => void;
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onOpenCropper: (student: Student) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  index,
  totalStudents,
  isGroupProject,
  onUpdate,
  onRemove,
  onMove,
  onOpenCropper,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHoveredDrag, setIsHoveredDrag] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  const isLeader = isGroupProject && index === 0;
  const indexCheck = validateIndexNumber(student.indexNumber);

  // Handle image file selection / drop
  const handleFileChange = async (file: File) => {
    setIsProcessingUpload(true);
    try {
      const processed = await processInputImageFile(file);
      
      // Perform automatic face detection
      const faceBox = await detectFaceInImage(processed.dataUrl);
      const smartCrop: CropData = calculateSmartCrop(
        processed.width,
        processed.height,
        faceBox,
        3 / 4
      );

      // Render high-res cropped JPEG
      const croppedJpeg = await renderCroppedImage(processed.dataUrl, smartCrop, {
        targetWidth: 600,
        targetHeight: 800,
        quality: 0.95,
      });

      onUpdate({
        ...student,
        originalImageUrl: processed.dataUrl,
        originalFileName: processed.fileName,
        originalFileType: processed.fileType,
        originalWidth: processed.width,
        originalHeight: processed.height,
        detectedFace: faceBox,
        crop: smartCrop,
        croppedImageUrl: croppedJpeg,
        isAiCropped: true,
      });
    } catch (err) {
      console.error('Failed to process image', err);
      alert('Could not process this image format. Please try standard JPG or PNG.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveredDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveredDrag(true);
  };

  const onDragLeave = () => {
    setIsHoveredDrag(false);
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCleanIndex = () => {
    const cleaned = sanitizeIndexNumber(student.indexNumber);
    onUpdate({ ...student, indexNumber: cleaned });
  };

  const handleFormatName = () => {
    const formatted = formatStudentNameWithInitials(student.name);
    onUpdate({ ...student, name: formatted });
  };

  return (
    <div className={`student-card-box ${isLeader ? 'leader-card' : ''}`}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,.heic,.heif"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {/* Card Header & Reordering */}
      <div className="card-top-bar">
        <div className="student-badge-area">
          <span className="order-number">#{index + 1}</span>
          {isLeader ? (
            <span className="leader-pill">
              <Crown size={12} />
              <span>Group Leader</span>
            </span>
          ) : (
            <span className="member-pill">Member</span>
          )}
        </div>

        {isGroupProject && (
          <div className="card-reorder-actions">
            <button
              type="button"
              className="icon-nav-btn"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              title="Move Left (Reorder for Details Form)"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              className="icon-nav-btn"
              disabled={index === totalStudents - 1}
              onClick={() => onMove(index, index + 1)}
              title="Move Right (Reorder for Details Form)"
            >
              <ArrowRight size={14} />
            </button>
            {totalStudents > 1 && (
              <button
                type="button"
                className="icon-delete-btn"
                onClick={() => onRemove(student.id)}
                title="Remove Member"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Photo Preview & Upload Dropzone */}
      <div
        className={`photo-drop-area ${isHoveredDrag ? 'drag-over' : ''} ${
          student.croppedImageUrl ? 'has-photo' : 'empty-photo'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={student.croppedImageUrl ? undefined : triggerUploadClick}
      >
        {isProcessingUpload ? (
          <div className="photo-upload-state">
            <div className="spinner"></div>
            <span>Analyzing face...</span>
          </div>
        ) : student.croppedImageUrl ? (
          <div className="photo-display-wrapper">
            <img
              src={student.croppedImageUrl}
              alt={student.name || 'Student headshot'}
              className="cropped-preview-img"
            />
            {student.isAiCropped && (
              <span className="ai-crop-tag" title="Auto-framed using face detection">
                <Sparkles size={11} />
                <span>AI Framed</span>
              </span>
            )}
            <div className="photo-hover-overlay">
              <button
                type="button"
                className="overlay-btn"
                onClick={() => onOpenCropper(student)}
                title="Crop and frame photo"
              >
                <Crop size={14} />
                <span>Crop / Adjust</span>
              </button>
              <button
                type="button"
                className="overlay-btn secondary"
                onClick={triggerUploadClick}
                title="Replace photo"
              >
                <Upload size={14} />
                <span>Replace</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="drop-prompt">
            <div className="upload-icon-circle">
              <Upload size={20} />
            </div>
            <p className="drop-text-primary">Click or drop headshot</p>
            <p className="drop-text-secondary">JPG, PNG, WebP, HEIC</p>
          </div>
        )}
      </div>

      {/* Form Fields: Index Number & Student Name */}
      <div className="card-fields-body">
        {/* Index Number Field */}
        <div className="field-block">
          <div className="field-header">
            <label className="field-label">
              1. Index Number <span className="req">*</span>
            </label>
            {indexCheck.hasSpaces && (
              <button
                type="button"
                className="quick-fix-btn"
                onClick={handleCleanIndex}
                title="Remove spaces from index number"
              >
                <Wand2 size={11} />
                <span>Strip Spaces</span>
              </button>
            )}
          </div>
          <div className={`input-wrapper ${indexCheck.hasSpaces ? 'has-error' : ''}`}>
            <input
              type="text"
              placeholder="e.g. 214001A"
              value={student.indexNumber}
              onChange={(e) => onUpdate({ ...student, indexNumber: e.target.value })}
              className="text-input index-input"
            />
            {student.indexNumber && !indexCheck.hasSpaces && (
              <CheckCircle2 size={15} className="input-valid-icon" />
            )}
          </div>
          {indexCheck.hasSpaces && (
            <div className="validation-inline-error">
              <AlertCircle size={12} />
              <span>PDF rule: No spaces allowed in index number!</span>
            </div>
          )}
        </div>

        {/* Name with Initials Field */}
        <div className="field-block">
          <div className="field-header">
            <label className="field-label">
              2. Name with Initials <span className="req">*</span>
            </label>
            {student.name.trim() && (
              <button
                type="button"
                className="quick-fix-btn"
                onClick={handleFormatName}
                title="Format to A.B.C. Surname"
              >
                <Wand2 size={11} />
                <span>Format</span>
              </button>
            )}
          </div>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="e.g. A.B.C. Perera"
              value={student.name}
              onChange={(e) => onUpdate({ ...student, name: e.target.value })}
              className="text-input"
            />
          </div>
          <span className="field-hint">Must be placed below index number</span>
        </div>
      </div>
    </div>
  );
};
