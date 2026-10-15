import React, { useRef, useState } from 'react';
import type { Student } from '../types';
import { loadPhotoFile, IMAGE_ACCEPT } from '../utils/fileUtils';
import { detectFace, calculateHeadshotCrop } from '../utils/faceDetector';
import { photosComplete } from '../utils/validation';
import {
  UploadCloud,
  Crop,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2
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
      alert('Could not decode this photo. Please try a standard JPG or PNG.');
    } finally {
      setProcessingId(null);
    }
  };

  const triggerUploadFor = (studentId: string) => {
    currentTargetStudentId.current = studentId;
    singleInputRef.current?.click();
  };

  const handleBatchUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsBatchProcessing(true);
    const fileArray = Array.from(files);

    try {
      const copy = [...students];
      for (let i = 0; i < fileArray.length && i < copy.length; i++) {
        const file = fileArray[i];
        const student = copy[i];
        try {
          const { src, img } = await loadPhotoFile(file);
          const W = img.naturalWidth;
          const H = img.naturalHeight;
          const face = await detectFace(img).catch(() => null);
          const crop = calculateHeadshotCrop(W, H, face);

          copy[i] = {
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
          console.warn(`Failed photo #${i + 1}`, err);
        }
      }
      onUpdateStudents(copy);
    } finally {
      setIsBatchProcessing(false);
    }
  };

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
          handleBatchUpload(e.target.files);
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
                className={`photo-box ${!photo ? 'empty' : ''}`}
                onClick={photo || isBusy ? undefined : () => triggerUploadFor(student.id)}
              >
                {isBusy ? (
                  <div className="photo-box-state">
                    <Loader2 size={24} className="spin-icon" />
                    <span>Detecting face...</span>
                  </div>
                ) : photo ? (
                  <CroppedPreview photo={photo} />
                ) : (
                  <div className="photo-box-prompt">
                    <UploadCloud size={24} />
                    <span>Click to upload headshot</span>
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
                    >
                      <Crop size={14} />
                      <span>Adjust Crop</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => triggerUploadFor(student.id)}
                    >
                      <span>Replace</span>
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
