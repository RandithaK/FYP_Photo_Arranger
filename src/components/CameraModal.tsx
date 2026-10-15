import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Student } from '../types';
import {
  Camera,
  SwitchCamera,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import './CameraModal.css';

interface CameraModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (studentId: string, file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  student,
  isOpen,
  onClose,
  onCapture,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedFileRef = useRef<File | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      setIsLoading(true);
      setError(null);
      setCapturedDataUrl(null);
      capturedFileRef.current = null;
      stopStream();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser or environment.');
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1440, min: 480 },
          },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = newStream;
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play().catch(() => {});
        }

        // Detect available cameras count
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        } catch {
          setHasMultipleCameras(true);
        }
      } catch (err: unknown) {
        console.warn('Camera error:', err);
        const errorObj = err as { name?: string; message?: string };
        let msg = 'Could not access device camera.';
        if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
          msg = 'Camera permission was denied. Please allow camera access in your browser settings.';
        } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
          msg = 'No camera found on this device.';
        } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError') {
          msg = 'Camera is in use by another application or tab.';
        } else if (errorObj?.message) {
          msg = errorObj.message;
        }
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    let ignore = false;

    void (async () => {
      await Promise.resolve();
      if (ignore) return;
      startCamera(facingMode);
    })();

    return () => {
      ignore = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, startCamera]);

  const handleToggleCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      // Mirror front camera to match the natural mirror viewfinder preview
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, vw, vh);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
    setCapturedDataUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const filename = `photo_${student.indexNumber || student.id}_${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: 'image/jpeg' });
          capturedFileRef.current = file;
        }
      },
      'image/jpeg',
      0.96
    );
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    capturedFileRef.current = null;
    // ensure video is playing
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleUsePhoto = () => {
    if (capturedFileRef.current) {
      onCapture(student.id, capturedFileRef.current);
      stopStream();
      onClose();
    }
  };

  const handleClose = () => {
    stopStream();
    setCapturedDataUrl(null);
    capturedFileRef.current = null;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="camera-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="camera-modal-header">
          <div>
            <h3>Take Headshot with Camera</h3>
            <span className="camera-modal-subtitle">
              {student.name || student.indexNumber || 'Student'} · {facingMode === 'user' ? 'Front (Selfie)' : 'Rear (Back)'} Camera
            </span>
          </div>

          <div className="header-right-actions">
            {!capturedDataUrl && !error && hasMultipleCameras && (
              <button
                type="button"
                className="btn btn-secondary btn-sm switch-cam-btn"
                onClick={handleToggleCamera}
                title="Switch front / rear camera"
                disabled={isLoading}
              >
                <SwitchCamera size={15} />
                <span>Switch to {facingMode === 'user' ? 'Rear' : 'Front'}</span>
              </button>
            )}
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={handleClose}
              title="Close camera"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder Stage */}
        <div className="camera-stage">
          {error ? (
            <div className="camera-error-container">
              <AlertCircle size={44} className="camera-error-icon" />
              <h4>Camera Unavailable</h4>
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => startCamera(facingMode)}
              >
                <RefreshCw size={15} />
                <span>Try Again</span>
              </button>
            </div>
          ) : capturedDataUrl ? (
            /* Review captured snapshot */
            <div className="camera-preview-container">
              <img
                src={capturedDataUrl}
                alt="Captured headshot preview"
                className="camera-captured-img"
              />
              <div className="camera-guide-overlay">
                <div className="camera-guide-frame">
                  <div className="camera-guide-oval" />
                  <div className="camera-guide-eye-line">
                    <span>Eye level</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live video stream */
            <div className="camera-video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`camera-video-elem ${facingMode === 'user' ? 'mirrored' : ''}`}
              />

              {/* Headshot Framing Overlay */}
              <div className="camera-guide-overlay">
                <div className="camera-guide-frame">
                  <div className="camera-guide-oval" />
                  <div className="camera-guide-eye-line">
                    <span>Eye level</span>
                  </div>
                </div>
              </div>

              {isLoading && (
                <div className="camera-loading-overlay">
                  <Loader2 size={32} className="spin-icon" />
                  <span>Starting camera...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="camera-modal-footer">
          {capturedDataUrl ? (
            /* Review Actions */
            <div className="camera-review-controls">
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={handleRetake}
              >
                <RotateCcw size={16} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleUsePhoto}
              >
                <Check size={18} />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : (
            /* Live Shutter Controls */
            <div className="camera-shutter-controls">
              {hasMultipleCameras && (
                <button
                  type="button"
                  className="btn btn-ghost cam-switch-mobile-btn"
                  onClick={handleToggleCamera}
                  title="Switch front / rear camera"
                  disabled={isLoading || Boolean(error)}
                >
                  <SwitchCamera size={18} />
                  <span>{facingMode === 'user' ? 'Rear' : 'Front'}</span>
                </button>
              )}

              <button
                type="button"
                className="shutter-btn"
                onClick={handleSnap}
                disabled={isLoading || Boolean(error) || !stream}
                title="Take Photo"
                aria-label="Capture photo"
              >
                <div className="shutter-inner">
                  <Camera size={26} />
                </div>
              </button>

              <button
                type="button"
                className="btn btn-ghost cam-cancel-btn"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
