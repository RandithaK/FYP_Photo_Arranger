import React, { useEffect, useRef, useState } from 'react';
import type { Student, ProjectType } from '../types';
import {
  renderSubmission,
  canvasToJpeg,
  submissionFilename,
  outputCardWidth,
  LOW_RES_CARD_WIDTH
} from '../utils/canvasRenderer';
import { downloadBlob } from '../utils/fileUtils';
import { DownloadModal } from './DownloadModal';
import {
  Download,
  Copy,
  Check,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface Step3PreviewProps {
  projectType: ProjectType;
  students: Student[];
  onBack: () => void;
  onReset: () => void;
}

export const Step3Preview: React.FC<Step3PreviewProps> = ({
  projectType,
  students,
  onBack,
  onReset,
}) => {
  const isGroup = projectType === 'group';
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isRendering, setIsRendering] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, cardW: 0 });

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      setIsRendering(true);
      renderSubmission(students)
        .then((canvas) => {
          if (!active) return;
          canvasRef.current = canvas;
          setDimensions({
            width: canvas.width,
            height: canvas.height,
            cardW: outputCardWidth(students),
          });

          const container = containerRef.current;
          if (container) {
            container.innerHTML = '';
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            canvas.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            canvas.style.border = '1px solid #cbd5e1';
            canvas.style.display = 'block';
            container.appendChild(canvas);
          }
        })
        .catch((err) => console.error('Canvas render error', err))
        .finally(() => {
          if (active) setIsRendering(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [students]);

  const handleOpenDownloadModal = () => {
    if (!canvasRef.current) return;
    setIsDownloadModalOpen(true);
  };

  const handleConfirmDownload = async (groupNo: string, groupName: string) => {
    if (!canvasRef.current) return;
    setIsDownloading(true);
    try {
      const blob = await canvasToJpeg(canvasRef.current, 0.96);
      const filename = submissionFilename(students, isGroup, { groupNo, groupName });
      downloadBlob(blob, filename);
      setIsDownloadModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Could not export JPEG image.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!canvasRef.current || !navigator.clipboard) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }, 'image/png');
    } catch {
      alert('Clipboard copy is not supported in this browser. Please use Download JPEG.');
    }
  };

  const isLowRes = dimensions.cardW > 0 && dimensions.cardW < LOW_RES_CARD_WIDTH;

  return (
    <div className="step-card">
      <div className="step-card-header">
        <div>
          <h2>Step 3: Preview & Download</h2>
          <p className="step-card-desc">
            Your final submission image is rendered according to official layout guidelines.
          </p>
        </div>

        <div className="header-action-btns">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopy}
            disabled={isRendering}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleOpenDownloadModal}
            disabled={isRendering || isDownloading}
          >
            {isDownloading ? <Loader2 size={16} className="spin-icon" /> : <Download size={16} />}
            <span>Download JPEG</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="preview-canvas-box">
        {isRendering ? (
          <div className="preview-loading">
            <Loader2 size={32} className="spin-icon" />
            <span>Rendering high-resolution submission...</span>
          </div>
        ) : null}
        <div ref={containerRef} className="preview-canvas-container" />
      </div>

      {/* Output Specs bar */}
      <div className="preview-meta-bar">
        <div className="meta-info">
          <span>Format: <strong>JPEG ONLY</strong></span>
          {dimensions.width > 0 && (
            <>
              <span className="meta-dot">·</span>
              <span>Dimensions: <strong>{dimensions.width} × {dimensions.height} px</strong></span>
              <span className="meta-dot">·</span>
              <span>Individual Card: <strong>{dimensions.cardW} px width</strong> (Max quality from uploaded photos)</span>
            </>
          )}
        </div>

        {isLowRes && (
          <div className="low-res-warn">
            <AlertTriangle size={14} />
            <span>Low resolution warning: Upload higher resolution source photos for crisper prints.</span>
          </div>
        )}
      </div>

      {/* Checklist Grid */}
      <div className="guideline-summary-grid">
        <div className="summary-item">
          <CheckCircle2 size={16} className="text-success" />
          <span>Professional 3:4 Headshots</span>
        </div>
        <div className="summary-item">
          <CheckCircle2 size={16} className="text-success" />
          <span>Index Number above Name (No spaces)</span>
        </div>
        <div className="summary-item">
          <CheckCircle2 size={16} className="text-success" />
          <span>All Photos Identical in Size</span>
        </div>
        <div className="summary-item">
          <CheckCircle2 size={16} className="text-success" />
          <span>{isGroup ? 'Member #1 is Group Leader' : 'Single Individual Photo'}</span>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="step-footer">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Photos</span>
        </button>

        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <RotateCcw size={15} />
          <span>Start New Submission</span>
        </button>
      </div>

      {/* Group Info / Download Filename Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onConfirm={handleConfirmDownload}
        isDownloading={isDownloading}
      />
    </div>
  );
};
