import React from 'react';
import {
  CheckCircle2,
  XCircle,
  X,
  FileText,
  Camera,
  Layers,
  Award
} from 'lucide-react';
import './GuidelinesModal.css';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="guidelines-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="guidelines-header">
          <div className="guidelines-title-row">
            <div className="guidelines-icon-box">
              <FileText size={22} />
            </div>
            <div>
              <h3>Final Year Project – Group Photo Submission Guidelines</h3>
              <p className="guidelines-subtitle">Official university specification & compliance guide</p>
            </div>
          </div>
          <button className="icon-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="guidelines-content-body">
          {/* Section 1 */}
          <div className="spec-rule-section">
            <div className="rule-badge-title">
              <Camera size={16} />
              <h4>1. Photo Requirements</h4>
            </div>
            <ul className="spec-bullet-list">
              <li>Each student must provide a <strong>professional headshot</strong> showing <strong>only the face</strong>.</li>
              <li>Casual photos, selfies, full-body images, or blurred images are <strong>not acceptable</strong>.</li>
              <li>All photos must be clear, well-lit, and formal.</li>
            </ul>

            <div className="examples-comparison-grid">
              <div className="example-box correct">
                <div className="example-badge success">
                  <CheckCircle2 size={16} />
                  <span>Correct: Tight Face Crop</span>
                </div>
                <div className="example-visual-card">
                  <div className="visual-photo-area headshot">
                    <div className="face-circle">Headshot Only</div>
                  </div>
                  <div className="visual-text-area">
                    <div className="visual-index">214001A</div>
                    <div className="visual-name">A.B.C. Perera</div>
                  </div>
                </div>
              </div>

              <div className="example-box wrong">
                <div className="example-badge danger">
                  <XCircle size={16} />
                  <span>Incorrect: Upper Body / Torso</span>
                </div>
                <div className="example-visual-card">
                  <div className="visual-photo-area torso">
                    <div className="torso-box">Too Zoomed Out</div>
                  </div>
                  <div className="visual-text-area">
                    <div className="visual-index">214001A</div>
                    <div className="visual-name">A.B.C. Perera</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="spec-rule-section">
            <div className="rule-badge-title">
              <Award size={16} />
              <h4>2. Name and Index Number Format</h4>
            </div>
            <ul className="spec-bullet-list">
              <li>The <strong>index number</strong> must be placed <strong>above</strong> the student’s name.</li>
              <li>The <strong>student’s name with initials</strong> must be placed <strong>below</strong> the index number.</li>
              <li><strong className="text-danger">Do not leave any spaces around the index number.</strong></li>
            </ul>

            <div className="examples-comparison-grid">
              <div className="example-box correct">
                <div className="example-badge success">
                  <CheckCircle2 size={16} />
                  <span>Correct: Compact, No Extra Space</span>
                </div>
                <div className="text-box-spec correct-box">
                  <div className="spec-cell-index">214001A</div>
                  <div className="spec-cell-name">A.B.C. Perera</div>
                </div>
              </div>

              <div className="example-box wrong">
                <div className="example-badge danger">
                  <XCircle size={16} />
                  <span>Incorrect: Extra Whitespace</span>
                </div>
                <div className="text-box-spec wrong-box">
                  <div className="spec-cell-index empty-space">204001A</div>
                  <div className="spec-cell-name">A.B.C. Perera</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 & 4 */}
          <div className="spec-rule-section">
            <div className="rule-badge-title">
              <Layers size={16} />
              <h4>3. Photo Arrangement & Layout</h4>
            </div>
            <ul className="spec-bullet-list">
              <li>Arrange photos in the <strong>same order</strong> as students appear in the <strong>Final Year Project Details Form</strong>.</li>
              <li>All photos must be <strong>identical in size</strong>.</li>
              <li>No photo should be larger, smaller, stretched, or misaligned compared to others.</li>
              <li>Ensure a clean, consistent layout with no overlaps and uniform spacing.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="spec-rule-section highlight-box">
            <div className="rule-badge-title">
              <Award size={16} />
              <h4>5. Final Submission Rules</h4>
            </div>
            <div className="final-rules-columns">
              <div className="rule-subcolumn">
                <h5>Group Project:</h5>
                <p>
                  Submit <strong>one combined image</strong> containing all group members. Individual photos are <strong>not allowed</strong>.
                  The first member listed <strong>must be the Group Leader</strong>.
                </p>
              </div>
              <div className="rule-subcolumn">
                <h5>Individual Project:</h5>
                <p>
                  Submit <strong>one image</strong> containing your photo with required details.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="guidelines-footer">
          <span className="footer-tip">
            <CheckCircle2 size={15} color="#16a34a" />
            <span>This application automatically enforces exact sizing, font alignment, and single JPEG export!</span>
          </span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it, Let's build!
          </button>
        </div>
      </div>
    </div>
  );
};
