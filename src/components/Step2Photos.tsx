import React, { useRef, useState } from 'react';
import type { Student } from '../types';
import { loadPhotoFile, IMAGE_ACCEPT } from '../utils/fileUtils';
import { detectFace, calculateHeadshotCrop } from '../utils/faceDetector';
import { photosComplete } from '../utils/validation';
import { CameraModal } from './CameraModal';
import {
  UploadCloud,
  Crop,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  Camera,
  FolderOpen
} from 'lucide-react';

interface Step2PhotosProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onOpenCropper: (student: Student) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2Photos: React.FC<Step2PhotosProps> = ({
  students,
  onUpdateStudents,
  onOpenCropper,
  onBack,
  onNext,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [cameraStudentId, setCameraStudentId] = useState<string | null>(null);
  const [dragOverStudentId, setDragOverStudentId] = useState<string | null>(null);

  const dragCounterRef = useRef<Record<string, number>>({});
  const batchInputRef = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const currentTargetStudentId = useRef<string | null>(null);

  const isAllPhotosDone = photosComplete(students);

  const processAndAssignPhoto = async (studentId: string, file: File): Promise<void> => {
    const { src, img } = await loadPhotoFile(file);
    const W = img.naturalWidth;
    const H = img.naturalHeight;

    const face = await detectFace(img).catch(() => null);
    const crop = calculateHeadshotCrop(W, H, face);

    onUpdateStudents(
      students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              photo: {
                src,
                width: W,
                height: H,
                crop,
                faceFound: Boolean(face),
              },
            }
          : s
      )
    );
  };

  const handleSingleUpload = async (studentId: string, file: File) => {
    setProcessingId(studentId);
    try {
      await processAndAssignPhoto(studentId, file);
    } catch (e) {
      console.error(e);
      alert('Could not decode this photo. Please try a standard JPG, PNG, or WebP image.');
    } finally {
      setProcessingId(null);
    }
  };

  const triggerUploadFor = (studentId: string) => {
    currentTargetStudentId.current = studentId;
    singleInputRef.current?.click();
  };

  const handleBatchUpload = async (files: FileList | File[] | null, startIndex = 0) => {
    if (!files || files.length === 0) return;
    setIsBatchProcessing(true);
    const fileArray = Array.from(files);

    try {
      const copy = [...students];
      for (let i = 0; i < fileArray.length && startIndex + i < copy.length; i++) {
        const file = fileArray[i];
        const targetIdx = startIndex + i;
        const student = copy[targetIdx];
        try {
          const { src, img } = await loadPhotoFile(file);
          const W = img.naturalWidth;
          const H = img.naturalHeight;
          const face = await detectFace(img).catch(() => null);
          const crop = calculateHeadshotCrop(W, H, face);

          copy[targetIdx] = {
            ...student,
            photo: {
              src,
              width: W,
              height: H,
              crop,
              faceFound: Boolean(face),
            },
          };
        } catch (err) {
          console.warn(`Failed photo #${targetIdx + 1}`, err);
        }
      }
      onUpdateStudents(copy);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  /* Drag and Drop event handlers */
  const handleDragEnter = (studentId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[studentId] = (dragCounterRef.current[studentId] || 0) + 1;
    setDragOverStudentId(studentId);
  };

  const handleDragLeave = (studentId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[studentId] = Math.max(0, (dragCounterRef.current[studentId] || 1) - 1);
    if (dragCounterRef.current[studentId] === 0 && dragOverStudentId === studentId) {
      setDragOverStudentId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (studentId: string, idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[studentId] = 0;
    setDragOverStudentId(null);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      await handleBatchUpload(files, idx);
    } else {
      const file = files[0];
      await handleSingleUpload(studentId, file);
    }
  };

  const activeStudentForCamera = students.find((s) => s.id === cameraStudentId) || null;

  return (
    <div className="step-card">
      {/* Hidden Inputs */}
      <input
        type="file"
        ref={singleInputRef}
        style={{ display: 'none' }}
        accept={IMAGE_ACCEPT}
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && currentTargetStudentId.current) {
            handleSingleUpload(currentTargetStudentId.current, e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={batchInputRef}
        style={{ display: 'none' }}
        multiple
        accept={IMAGE_ACCEPT}
        onChange={(e) => {
          handleBatchUpload(e.target.files, 0);
          e.target.value = '';
        }}
      />

      <div className="step-card-header">
        <div>
          <h2>Step 2: Upload & Crop Photos</h2>
          <p className="step-card-desc">
            Each student needs a professional headshot showing only the face. Face detection frames each photo automatically.
          </p>
        </div>

        {students.length > 1 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => batchInputRef.current?.click()}
            disabled={isBatchProcessing}
          >
            <UploadCloud size={16} />
            <span>{isBatchProcessing ? 'Processing Photos...' : 'Batch Upload All'}</span>
          </button>
        )}
      </div>

      {/* Professional Photo Guidelines Notice */}
      <div className="photo-guideline-notice">
        <div className="photo-guideline-notice-icon">
          <AlertTriangle size={18} />
        </div>
        <div className="photo-guideline-notice-text">
          <strong>Professional Photo Requirement:</strong> All uploads and camera captures must be formal, forward-facing headshots with a plain/light background. <span>Casual selfies, party photos, tilted angles, filters, or full-body photos will be rejected per submission guidelines.</span>
        </div>
      </div>

      {/* Grid of photo upload cards */}
      <div className="photos-grid">
        {students.map((student, idx) => {
          const photo = student.photo;
          const isBusy = processingId === student.id || isBatchProcessing;

          return (
            <div key={student.id} className="photo-card">
              <div className="photo-card-info">
                <span className="photo-card-index">#{idx + 1} · {student.indexNumber}</span>
                <span className="photo-card-name">{student.name}</span>
              </div>

              {/* Photo Area */}
              <div
                className={`photo-box ${!photo ? 'empty' : ''} ${dragOverStudentId === student.id ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(student.id, e)}
                onDragLeave={(e) => handleDragLeave(student.id, e)}
                onDrop={(e) => handleDrop(student.id, idx, e)}
                onClick={photo || isBusy ? undefined : () => triggerUploadFor(student.id)}
              >
                {isBusy ? (
                  <div className="photo-box-state">
                    <Loader2 size={24} className="spin-icon" />
                    <span>Detecting face...</span>
                  </div>
                ) : dragOverStudentId === student.id ? (
                  <div className="photo-box-drag-active">
                    <UploadCloud size={32} className="drag-icon-bounce" />
                    <span>Drop Photo Here</span>
                  </div>
                ) : photo ? (
                  <CroppedPreview photo={photo} />
                ) : (
                  <div className="photo-box-prompt">
                    <UploadCloud size={24} className="upload-cloud-icon" />
                    <span className="drag-drop-hint">Drag & drop photo here</span>
                    <span className="photo-formal-hint">Formal headshot only (no selfies)</span>
                    <span className="or-divider">or</span>
                    <div className="empty-box-btn-group">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm empty-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerUploadFor(student.id);
                        }}
                      >
                        <FolderOpen size={13} />
                        <span>Browse File</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm empty-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCameraStudentId(student.id);
                        }}
                      >
                        <Camera size={13} />
                        <span>Use Camera</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              {photo && (
                <div className="photo-card-footer">
                  <div className="photo-status-row">
                    {photo.faceFound ? (
                      <span className="badge-status success">
                        <Sparkles size={12} />
                        <span>Face auto-framed</span>
                      </span>
                    ) : (
                      <span className="badge-status warning">
                        <AlertCircle size={12} />
                        <span>Check framing</span>
                      </span>
                    )}
                  </div>

                  <div className="photo-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenCropper(student)}
                      title="Adjust Crop Framing"
                    >
                      <Crop size={14} />
                      <span>Crop</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => triggerUploadFor(student.id)}
                      title="Browse replacement photo file"
                    >
                      <FolderOpen size={14} />
                      <span>Browse</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCameraStudentId(student.id)}
                      title="Take new photo using camera"
                    >
                      <Camera size={14} />
                      <span>Camera</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step Navigation */}
      <div className="step-footer">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Details</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!isAllPhotosDone}
          onClick={onNext}
        >
          <span>Next: Preview & Export</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Device Camera Modal */}
      {activeStudentForCamera && (
        <CameraModal
          student={activeStudentForCamera}
          isOpen={Boolean(activeStudentForCamera)}
          onClose={() => setCameraStudentId(null)}
          onCapture={handleSingleUpload}
        />
      )}
    </div>
  );
};

/**
 * Renders a crisp 3:4 CSS crop representation of the photo
 */
const CroppedPreview: React.FC<{ photo: Student['photo'] }> = ({ photo }) => {
  if (!photo) return null;

  const { src, width, height, crop } = photo;

  // Scale factors to fit cropped box inside CSS container
  const scale = 100 / (crop.width / width);
  const offsetX = (crop.x / width) * 100;
  const offsetY = (crop.y / height) * 100;

  return (
    <div className="cropped-container">
      <img
        src={src}
        alt="Cropped headshot"
        style={{
          width: `${scale}%`,
          transform: `translate(-${offsetX}%, -${offsetY}%)`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
};
