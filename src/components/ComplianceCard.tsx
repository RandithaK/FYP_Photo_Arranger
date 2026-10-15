import React from 'react';
import type { ProjectConfig, ProjectValidation } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';
import './ComplianceCard.css';

interface ComplianceCardProps {
  config: ProjectConfig;
  validation: ProjectValidation;
  onOpenGuidelinesModal: () => void;
}

export const ComplianceCard: React.FC<ComplianceCardProps> = ({
  config,
  validation,
  onOpenGuidelinesModal,
}) => {
  const isGroup = config.projectType === 'group';

  // Rule 1: All photos present and cropped to headshot
  const rule1PhotosPass = validation.allPhotosUploaded;

  // Rule 2: Index numbers valid and have NO spaces
  const rule2IndexPass = Object.values(validation.studentValidations).every(
    (sv) => sv.indexNumberValid && sv.indexNumberHasNoSpaces
  );

  // Rule 3: Names present
  const rule3NamesPass = Object.values(validation.studentValidations).every((sv) => sv.nameValid);

  // Rule 4: Arrangement & Identical Sizing (System enforced)
  const rule4ArrangementPass = true;

  // Rule 5: First member is group leader (if group project)
  const rule5LeaderPass = !isGroup || validation.leaderSpecified;

  // Rule 6: Output is strictly JPEG
  const rule6JpegPass = true;

  const totalChecks = 6;
  const passedChecks = [
    rule1PhotosPass,
    rule2IndexPass,
    rule3NamesPass,
    rule4ArrangementPass,
    rule5LeaderPass,
    rule6JpegPass,
  ].filter(Boolean).length;

  const allPassed = passedChecks === totalChecks;

  return (
    <div className={`compliance-card-container ${allPassed ? 'all-passed' : 'has-pending'}`}>
      <div className="compliance-header">
        <div className="compliance-title-group">
          <ShieldCheck size={20} className={allPassed ? 'icon-success' : 'icon-warning'} />
          <div>
            <h4>Guidelines Compliance Status</h4>
            <span className="compliance-subtitle">
              {passedChecks} of {totalChecks} rules verified for submission
            </span>
          </div>
        </div>

        <button
          type="button"
          className="guidelines-link-btn"
          onClick={onOpenGuidelinesModal}
        >
          <FileText size={14} />
          <span>View Guidelines</span>
        </button>
      </div>

      <div className="compliance-checklist-grid">
        {/* Rule 1 */}
        <div className={`checklist-item ${rule1PhotosPass ? 'passed' : 'pending'}`}>
          {rule1PhotosPass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>1. Professional headshots (face only)</span>
        </div>

        {/* Rule 2 */}
        <div className={`checklist-item ${rule2IndexPass ? 'passed' : 'pending'}`}>
          {rule2IndexPass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>2. Index above name (No spaces allowed)</span>
        </div>

        {/* Rule 3 */}
        <div className={`checklist-item ${rule3NamesPass ? 'passed' : 'pending'}`}>
          {rule3NamesPass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>3. Name with initials below index</span>
        </div>

        {/* Rule 4 */}
        <div className={`checklist-item ${rule4ArrangementPass ? 'passed' : 'pending'}`}>
          {rule4ArrangementPass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>4. Identical size & form order</span>
        </div>

        {/* Rule 5 */}
        <div className={`checklist-item ${rule5LeaderPass ? 'passed' : 'pending'}`}>
          {rule5LeaderPass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>5. {isGroup ? 'Group Leader is 1st member' : 'Individual project mode'}</span>
        </div>

        {/* Rule 6 */}
        <div className={`checklist-item ${rule6JpegPass ? 'passed' : 'pending'}`}>
          {rule6JpegPass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>6. Combined single JPEG output</span>
        </div>
      </div>

      {!allPassed && validation.overallIssues.length > 0 && (
        <div className="pending-warnings-list">
          {validation.overallIssues.slice(0, 3).map((issue, idx) => (
            <div key={idx} className="warning-item">
              <AlertCircle size={12} />
              <span>{issue.message}</span>
            </div>
          ))}
          {validation.overallIssues.length > 3 && (
            <span className="more-issues-hint">
              + {validation.overallIssues.length - 3} more items to complete
            </span>
          )}
        </div>
      )}
    </div>
  );
};
