import React, { useState } from 'react';
import { Download, X, Hash, FolderHeart } from 'lucide-react';
import './DownloadModal.css';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupNo: string, groupName: string) => void;
  isDownloading: boolean;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDownloading,
}) => {
  const [groupNo, setGroupNo] = useState('');
  const [groupName, setGroupName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(groupNo, groupName);
  };

  const trimmedNo = groupNo.trim();
  const trimmedName = groupName.trim();
  const previewNo = trimmedNo || 'Group No';
  const previewName = trimmedName || 'Group Name';
  const previewFilename = `${previewNo}_${previewName} Photo.jpg`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="download-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="download-modal-header">
          <div className="download-modal-title">
            <Download size={20} className="download-modal-icon" />
            <div>
              <h3>Download Submission Image</h3>
              <p className="download-modal-subtitle">
                Enter your group information to format the file name according to submission guidelines.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn-ghost"
            onClick={onClose}
            aria-label="Close"
            disabled={isDownloading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="download-modal-form">
          <div className="download-modal-body">
            <div className="form-group">
              <label htmlFor="group-no-input">
                <Hash size={14} /> Group Number
              </label>
              <input
                id="group-no-input"
                type="text"
                placeholder="e.g. 1000"
                value={groupNo}
                onChange={(e) => setGroupNo(e.target.value)}
                autoFocus
                disabled={isDownloading}
              />
              <span className="field-hint">Optional: Leave blank to use default placeholder &quot;Group No&quot;</span>
            </div>

            <div className="form-group">
              <label htmlFor="group-name-input">
                <FolderHeart size={14} /> Group Name
              </label>
              <input
                id="group-name-input"
                type="text"
                placeholder="e.g. abc"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isDownloading}
              />
              <span className="field-hint">Optional: Leave blank to use default placeholder &quot;Group Name&quot;</span>
            </div>

            <div className="filename-preview-box">
              <span className="preview-label">Generated File Name:</span>
              <code className="preview-filename">{previewFilename}</code>
            </div>
          </div>

          <div className="download-modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isDownloading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isDownloading}
            >
              <Download size={16} />
              <span>{isDownloading ? 'Downloading...' : 'Download Image'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

