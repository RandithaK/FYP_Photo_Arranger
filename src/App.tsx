import { useState, useEffect } from 'react';
import type { Student, ProjectType, CropData } from './types';
import { preloadFaceDetector } from './utils/faceDetector';
import { useTheme } from './utils/useTheme';
import { Step1Details } from './components/Step1Details';
import { Step2Photos } from './components/Step2Photos';
import { Step3Preview } from './components/Step3Preview';
import { CropperModal } from './components/CropperModal';
import { GuidelinesModal } from './components/GuidelinesModal';
import {
  GraduationCap,
  BookOpen,
  Check,
  AlertTriangle,
  X,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import './App.css';

const INITIAL_GROUP_STUDENTS: Student[] = [
  { id: 's-1', indexNumber: '', name: '', photo: null },
  { id: 's-2', indexNumber: '', name: '', photo: null },
  { id: 's-3', indexNumber: '', name: '', photo: null },
  { id: 's-4', indexNumber: '', name: '', photo: null },
];

export function App() {
  const { preference, resolvedTheme, cycleTheme } = useTheme();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [projectType, setProjectType] = useState<ProjectType>('group');
  const [students, setStudents] = useState<Student[]>(INITIAL_GROUP_STUDENTS);

  const [cropperStudentId, setCropperStudentId] = useState<string | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Preload face detector in background so uploads feel instant
  useEffect(() => {
    preloadFaceDetector();
  }, []);

  const activeStudentForCrop = students.find((s) => s.id === cropperStudentId) || null;

  const handleSaveCrop = (studentId: string, crop: CropData) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId && s.photo
          ? {
              ...s,
              photo: {
                ...s.photo,
                crop,
              },
            }
          : s
      )
    );
  };

  const handleReset = () => {
    if (confirm('Start over with a fresh submission? All current entries will be cleared.')) {
      setProjectType('group');
      setStudents([
        { id: `s-${Date.now()}-1`, indexNumber: '', name: '', photo: null },
        { id: `s-${Date.now()}-2`, indexNumber: '', name: '', photo: null },
        { id: `s-${Date.now()}-3`, indexNumber: '', name: '', photo: null },
        { id: `s-${Date.now()}-4`, indexNumber: '', name: '', photo: null },
      ]);
      setCurrentStep(1);
    }
  };

  return (
    <div className="app-shell">
      {/* Disclaimer Banner on Initial Load */}
      {showDisclaimer && (
        <aside className="disclaimer-banner" role="alert">
          <div className="disclaimer-text">
            <AlertTriangle size={13} className="disclaimer-icon" />
            <span>Not affiliated with any university, use at your own risk</span>
          </div>
          <button
            type="button"
            className="disclaimer-dismiss-btn"
            onClick={() => setShowDisclaimer(false)}
            aria-label="Dismiss disclaimer"
          >
            <X size={13} />
          </button>
        </aside>
      )}

      {/* Top Navbar */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1>FYP Photo Arranger</h1>
            <span className="brand-sub">Academic Submission Tool</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={cycleTheme}
            title={
              preference === 'system'
                ? `System Theme (${resolvedTheme}) — click to switch to Light`
                : preference === 'light'
                ? 'Light Theme — click to switch to Dark'
                : 'Dark Theme — click to switch to System'
            }
            aria-label="Toggle light or dark theme"
          >
            {preference === 'system' ? (
              <Monitor size={15} />
            ) : resolvedTheme === 'dark' ? (
              <Moon size={15} />
            ) : (
              <Sun size={15} />
            )}
            <span>
              {preference === 'system' ? `Auto (${resolvedTheme})` : preference === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIsGuidelinesOpen(true)}
          >
            <BookOpen size={15} />
            <span>View Guidelines</span>
          </button>
        </div>
      </header>

      {/* Guided Step Progress Bar */}
      <nav className="step-progress-nav" aria-label="Submission Steps">
        <div className="step-progress-inner">
          <button
            type="button"
            className={`step-bubble ${currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="bubble-num">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
            <span className="bubble-label">1. Student Details</span>
          </button>

          <div className={`step-connector ${currentStep > 1 ? 'active' : ''}`} />

          <button
            type="button"
            className={`step-bubble ${currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : ''}`}
            onClick={() => {
              // Only allow jump to step 2 if step 1 has content
              if (students.some((s) => s.indexNumber && s.name)) setCurrentStep(2);
            }}
          >
            <div className="bubble-num">{currentStep > 2 ? <Check size={14} /> : '2'}</div>
            <span className="bubble-label">2. Upload Photos</span>
          </button>

          <div className={`step-connector ${currentStep > 2 ? 'active' : ''}`} />

          <button
            type="button"
            className={`step-bubble ${currentStep === 3 ? 'current' : ''}`}
            onClick={() => {
              if (students.every((s) => s.photo)) setCurrentStep(3);
            }}
          >
            <div className="bubble-num">3</div>
            <span className="bubble-label">3. Preview & Download</span>
          </button>
        </div>
      </nav>

      {/* Main Step Flow Container */}
      <main className="app-content-body">
        {currentStep === 1 && (
          <Step1Details
            projectType={projectType}
            students={students}
            onProjectTypeChange={setProjectType}
            onUpdateStudents={setStudents}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2Photos
            students={students}
            onUpdateStudents={setStudents}
            onOpenCropper={(s) => setCropperStudentId(s.id)}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Preview
            projectType={projectType}
            students={students}
            onBack={() => setCurrentStep(2)}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Manual Cropper Modal */}
      {activeStudentForCrop && activeStudentForCrop.photo && (
        <CropperModal
          key={activeStudentForCrop.id}
          student={activeStudentForCrop}
          isOpen={Boolean(activeStudentForCrop)}
          onClose={() => setCropperStudentId(null)}
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
