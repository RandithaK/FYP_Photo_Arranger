import { useState, useEffect } from 'react';
import type { ProjectConfig, Student, CropData, ProjectType } from './types';
import { DEFAULT_LAYOUT, SAMPLE_STUDENTS } from './utils/sampleData';
import { validateProject } from './utils/validation';
import { StudentList } from './components/StudentList';
import { PreviewPanel } from './components/PreviewPanel';
import { CropperModal } from './components/CropperModal';
import { GuidelinesModal } from './components/GuidelinesModal';
import { ComplianceCard } from './components/ComplianceCard';
import {
  GraduationCap,
  HelpCircle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import './App.css';

const STORAGE_KEY = 'fyp_photo_arranger_config_v1';

export function App() {
  // Initialize project state from localStorage or default sample
  const [config, setConfig] = useState<ProjectConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read saved configuration', e);
    }

    // Default: Group project with 4 sample students (matching PDF page 1 & 2 example)
    return {
      projectType: 'group',
      projectTitle: 'Final Year Project',
      batchOrYear: 'Batch 21',
      students: JSON.parse(JSON.stringify(SAMPLE_STUDENTS)),
      layout: DEFAULT_LAYOUT,
    };
  });

  // Active student in Cropper Modal
  const [activeCropperStudent, setActiveCropperStudent] = useState<Student | null>(null);

  // Guidelines Modal state
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Auto-save configuration changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      // If quota exceeded due to large base64 strings, ignore gracefully
      console.warn('Storage quota warning', e);
    }
  }, [config]);

  // Project validation result
  const validation = validateProject(config);

  // Update students list
  const handleUpdateStudents = (students: Student[]) => {
    setConfig((prev) => ({ ...prev, students }));
  };

  // Switch project type
  const handleProjectTypeChange = (projectType: ProjectType) => {
    setConfig((prev) => ({ ...prev, projectType }));
  };

  // Update layout settings
  const handleUpdateLayout = (newLayout: Partial<ProjectConfig['layout']>) => {
    setConfig((prev) => ({
      ...prev,
      layout: { ...prev.layout, ...newLayout },
    }));
  };

  // Save crop from modal
  const handleSaveCrop = (studentId: string, crop: CropData, croppedDataUrl: string) => {
    setConfig((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              crop,
              croppedImageUrl: croppedDataUrl,
              isAiCropped: false, // user manually adjusted/confirmed
            }
          : s
      ),
    }));
  };

  // Reset to initial demo sample
  const handleResetSample = () => {
    if (confirm('Reset to initial sample students?')) {
      setConfig({
        projectType: 'group',
        projectTitle: 'Final Year Project',
        batchOrYear: 'Batch 21',
        students: JSON.parse(JSON.stringify(SAMPLE_STUDENTS)),
        layout: DEFAULT_LAYOUT,
      });
    }
  };

  return (
    <div className="app-container">
      {/* Top Application Header */}
      <header className="app-navbar">
        <div className="navbar-brand">
          <div className="brand-logo">
            <GraduationCap size={24} />
          </div>
          <div className="brand-text">
            <h1>FYP Photo Arranger</h1>
            <p className="brand-tagline">
              Official Headshot Cropper & Submission Layout Generator
            </p>
          </div>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            className="nav-btn outline"
            onClick={() => setIsGuidelinesOpen(true)}
          >
            <BookOpen size={16} />
            <span>Guidelines & Rules</span>
          </button>

          <button
            type="button"
            className="nav-btn subtle"
            onClick={handleResetSample}
            title="Reset to default sample"
          >
            <RotateCcw size={15} />
            <span>Reset Demo</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Studio Layout */}
      <main className="app-main-content">
        {/* Left Column: Student Inputs, Management, and Compliance */}
        <section className="studio-col-left">
          {/* Compliance Card */}
          <ComplianceCard
            config={config}
            validation={validation}
            onOpenGuidelinesModal={() => setIsGuidelinesOpen(true)}
          />

          {/* Student Form & Photo Cards */}
          <StudentList
            students={config.students}
            projectType={config.projectType}
            onUpdateStudents={handleUpdateStudents}
            onProjectTypeChange={handleProjectTypeChange}
            onOpenCropper={(s) => setActiveCropperStudent(s)}
          />
        </section>

        {/* Right Column: Sticky Live Preview & High-Res Export */}
        <section className="studio-col-right">
          <div className="sticky-preview-wrapper">
            <PreviewPanel
              config={config}
              onUpdateLayout={handleUpdateLayout}
              isValid={validation.isValid}
            />

            {/* Quick Tips Box */}
            <div className="quick-help-card">
              <div className="quick-help-header">
                <HelpCircle size={16} />
                <h5>Quick Submission Checklist</h5>
              </div>
              <ul className="quick-help-list">
                <li>
                  <strong>Member #1 is Group Leader:</strong> In group projects, the first photo is always designated as the Leader.
                </li>
                <li>
                  <strong>Strict Order:</strong> Match the exact order of the Final Year Project Details Form using the arrow buttons.
                </li>
                <li>
                  <strong>Strict Index Format:</strong> No spaces around or within index number (e.g. <code>214001A</code>).
                </li>
                <li>
                  <strong>Output Format:</strong> Only <strong>JPEG</strong> is generated, formatted to official academic requirements.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Interactive Cropper Modal */}
      {activeCropperStudent && (
        <CropperModal
          key={activeCropperStudent.id}
          student={activeCropperStudent}
          isOpen={Boolean(activeCropperStudent)}
          onClose={() => setActiveCropperStudent(null)}
          onSaveCrop={handleSaveCrop}
        />
      )}

      {/* Official Guidelines Modal */}
      <GuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />
    </div>
  );
}

export default App;
