import React, { useEffect, useRef, useState } from 'react';
import type { ProjectConfig } from '../types';
import { renderCombinedCanvas } from '../utils/canvasRenderer';
import { downloadCanvasAsJpeg, copyCanvasToClipboard } from '../utils/fileUtils';
import {
  Download,
  Copy,
  Check,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  AlertTriangle
} from 'lucide-react';
import './PreviewPanel.css';

interface PreviewPanelProps {
  config: ProjectConfig;
  onUpdateLayout: (newLayout: Partial<ProjectConfig['layout']>) => void;
  isValid: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  config,
  onUpdateLayout,
  isValid,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; estSizeKb: number }>({
    width: 0,
    height: 0,
    estSizeKb: 0,
  });

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      setIsRendering(true);
      try {
        const renderedCanvas = await renderCombinedCanvas(config, config.layout.outputScale || 2);
        if (!active) return;
        canvasRef.current = renderedCanvas;

        const container = containerRef.current;
        if (container) {
          container.innerHTML = '';
          renderedCanvas.style.maxWidth = '100%';
          renderedCanvas.style.height = 'auto';
          renderedCanvas.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
          renderedCanvas.style.borderRadius = '2px';
          renderedCanvas.style.display = 'block';
          container.appendChild(renderedCanvas);
        }

        renderedCanvas.toBlob(
          (blob) => {
            if (blob && active) {
              setImageMeta({
                width: renderedCanvas.width,
                height: renderedCanvas.height,
                estSizeKb: Math.round(blob.size / 1024),
              });
            }
          },
          'image/jpeg',
          0.95
        );
      } catch (err) {
        console.error('Failed to render live preview', err);
      } finally {
        if (active) setIsRendering(false);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [config]);

  // Handle Download (STRICTLY JPEG as specified)
  const handleDownloadJpeg = () => {
    if (!canvasRef.current) return;
    let filename = 'FYP_Submission';
    if (config.projectType === 'group') {
      const leader = config.students[0];
      const leaderIndex = leader?.indexNumber.replace(/\s+/g, '') || 'Group';
      filename = `FYP_Group_Photo_${leaderIndex}`;
    } else {
      const student = config.students[0];
      const studentIndex = student?.indexNumber.replace(/\s+/g, '') || 'Individual';
      filename = `FYP_Photo_${studentIndex}`;
    }

    downloadCanvasAsJpeg(canvasRef.current, filename, 0.98);
  };

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    if (!canvasRef.current) return;
    const success = await copyCanvasToClipboard(canvasRef.current);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('Clipboard copy is not supported in this browser. Please use Download JPEG.');
    }
  };

  // Open in new tab for inspection
  const handleOpenFullSize = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.98);
    const win = window.open();
    if (win) {
      win.document.write(
        `<body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center; min-height:100vh;">
          <img src="${dataUrl}" style="max-width:95vw; max-height:95vh; box-shadow:0 10px 40px rgba(0,0,0,0.5); background:#fff;" />
        </body>`
      );
    }
  };

  return (
    <div className="preview-panel-container">
      {/* Top action header */}
      <div className="preview-panel-header">
        <div className="preview-title-block">
          <h3>Combined Final Submission Preview</h3>
          <span className="preview-subtitle">
            {config.projectType === 'group'
              ? 'One combined image containing all group members'
              : 'Single individual photo submission'}
          </span>
        </div>

        <div className="preview-header-actions">
          <button
            type="button"
            className="panel-btn secondary"
            onClick={handleCopy}
            title="Copy image to clipboard"
          >
            {copied ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            className="panel-btn secondary"
            onClick={handleOpenFullSize}
            title="View full resolution in new tab"
          >
            <Maximize2 size={15} />
            <span>Full View</span>
          </button>

          {/* Primary Download Button */}
          <button
            type="button"
            className={`panel-btn primary download-main-btn ${!isValid ? 'has-pending-warning' : ''}`}
            onClick={handleDownloadJpeg}
            title={isValid ? 'Download high-resolution JPEG' : 'Download JPEG (some guideline details may be pending)'}
          >
            {!isValid ? <AlertTriangle size={15} /> : <Download size={16} />}
            <span>Download JPEG</span>
          </button>
        </div>
      </div>

      {/* Style & Layout Formatting Controls */}
      <div className="layout-toolbar">
        {/* Layout Style Toggle */}
        <div className="toolbar-segment">
          <span className="toolbar-label">
            <Layers size={13} />
            <span>Arrangement Style:</span>
          </span>
          <button
            type="button"
            className={`toolbar-pill ${config.layout.seamlessTouching ? 'active' : ''}`}
            onClick={() =>
              onUpdateLayout({
                seamlessTouching: true,
                gap: 0,
                padding: 0,
              })
            }
          >
            Page 1: Seamless Touching
          </button>
          <button
            type="button"
            className={`toolbar-pill ${!config.layout.seamlessTouching ? 'active' : ''}`}
            onClick={() =>
              onUpdateLayout({
                seamlessTouching: false,
                gap: 12,
                padding: 16,
              })
            }
          >
            Page 2: Separated Bordered
          </button>
        </div>

        {/* Resolution Scale */}
        <div className="toolbar-segment">
          <span className="toolbar-label">Resolution Scale:</span>
          <select
            className="select-dropdown"
            value={config.layout.outputScale || 2}
            onChange={(e) => onUpdateLayout({ outputScale: parseInt(e.target.value) })}
          >
            <option value="1">1x Standard Web (72 DPI)</option>
            <option value="2">2x High-Res Print (300 DPI)</option>
            <option value="3">3x Ultra High-Res (Ultra Sharp)</option>
          </select>
        </div>

        {/* Font choice */}
        <div className="toolbar-segment">
          <span className="toolbar-label">Font Family:</span>
          <select
            className="select-dropdown"
            value={config.layout.fontFamily}
            onChange={(e) => onUpdateLayout({ fontFamily: e.target.value })}
          >
            <option value='"Times New Roman", Times, Georgia, serif'>
              Times New Roman (Formal Guideline)
            </option>
            <option value='Georgia, serif'>Georgia (Serif)</option>
            <option value='Arial, sans-serif'>Arial (Clean Sans)</option>
          </select>
        </div>
      </div>

      {/* Canvas Viewport Stage */}
      <div className="canvas-viewport-stage">
        {isRendering && (
          <div className="canvas-loading-overlay">
            <div className="spinner"></div>
            <span>Generating combined submission...</span>
          </div>
        )}

        <div
          className="canvas-render-wrapper"
          ref={containerRef}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
        />
      </div>

      {/* Meta Footer & Zoom Controls */}
      <div className="preview-panel-footer">
        <div className="output-specs-meta">
          <span className="spec-badge">
            Format: <strong>JPEG ONLY</strong>
          </span>
          {imageMeta.width > 0 && (
            <>
              <span className="spec-divider">•</span>
              <span className="spec-text">
                Dimensions: <strong>{imageMeta.width} × {imageMeta.height} px</strong>
              </span>
              <span className="spec-divider">•</span>
              <span className="spec-text">
                Est. Size: <strong>{imageMeta.estSizeKb} KB</strong>
              </span>
            </>
          )}
        </div>

        <div className="zoom-controls">
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          {zoomLevel !== 1 && (
            <button
              type="button"
              className="zoom-reset-btn"
              onClick={() => setZoomLevel(1)}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
