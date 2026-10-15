import React, { useRef } from 'react';
import type { Student, ProjectType, CropData } from '../types';
import { StudentCard } from './StudentCard';
import { processInputImageFile } from '../utils/fileUtils';
import { detectFaceInImage, calculateSmartCrop } from '../utils/faceDetector';
import { renderCroppedImage } from '../utils/cropEngine';
import { SAMPLE_STUDENTS } from '../utils/sampleData';
import {
  Users,
  User,
  Plus,
  UploadCloud,
  FileCheck2,
  Trash2,
  Sparkles
} from 'lucide-react';
import './StudentList.css';

interface StudentListProps {
  students: Student[];
  projectType: ProjectType;
  onUpdateStudents: (students: Student[]) => void;
  onProjectTypeChange: (type: ProjectType) => void;
  onOpenCropper: (student: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  projectType,
  onUpdateStudents,
  onProjectTypeChange,
  onOpenCropper,
}) => {
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Switch project type
  const handleTypeChange = (newType: ProjectType) => {
    if (newType === projectType) return;
    onProjectTypeChange(newType);

    if (newType === 'individual' && students.length > 1) {
      // Keep only first student
      onUpdateStudents([{ ...students[0], isLeader: false }]);
    } else if (newType === 'group' && students.length === 1) {
      // Set first student as leader, add another member
      const updated = [
        { ...students[0], isLeader: true },
        {
          id: `s-${Date.now()}-2`,
          indexNumber: '',
          name: '',
          isLeader: false,
          originalImageUrl: null,
          crop: { x: 0, y: 0, width: 0, height: 0, zoom: 1, rotation: 0, flipH: false, flipV: false },
          croppedImageUrl: null,
          isAiCropped: false,
        },
      ];
      onUpdateStudents(updated);
    }
  };

  // Update single student
  const handleUpdateStudent = (updatedStudent: Student) => {
    const updated = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    onUpdateStudents(updated);
  };

  // Remove student
  const handleRemoveStudent = (id: string) => {
    if (students.length <= 1) return;
    const remaining = students.filter((s) => s.id !== id);
    // Ensure first member is marked as leader in group mode
    if (projectType === 'group' && remaining.length > 0) {
      remaining[0].isLeader = true;
    }
    onUpdateStudents(remaining);
  };

  // Reorder student positions
  const handleMoveStudent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= students.length) return;
    const copy = [...students];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);

    // Update isLeader status: position 0 is leader
    if (projectType === 'group') {
      copy.forEach((s, idx) => {
        s.isLeader = idx === 0;
      });
    }

    onUpdateStudents(copy);
  };

  // Add new member
  const handleAddMember = () => {
    const newStudent: Student = {
      id: `s-${Date.now()}`,
      indexNumber: '',
      name: '',
      isLeader: false,
      originalImageUrl: null,
      crop: { x: 0, y: 0, width: 0, height: 0, zoom: 1, rotation: 0, flipH: false, flipV: false },
      croppedImageUrl: null,
      isAiCropped: false,
    };
    onUpdateStudents([...students, newStudent]);
  };

  // Batch upload multiple photos
  const handleBatchUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const updatedStudents = [...students];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const processed = await processInputImageFile(file);
        const faceBox = await detectFaceInImage(processed.dataUrl);
        const smartCrop: CropData = calculateSmartCrop(
          processed.width,
          processed.height,
          faceBox,
          3 / 4
        );
        const croppedJpeg = await renderCroppedImage(processed.dataUrl, smartCrop, {
          targetWidth: 600,
          targetHeight: 800,
          quality: 0.95,
        });

        if (i < updatedStudents.length) {
          updatedStudents[i] = {
            ...updatedStudents[i],
            originalImageUrl: processed.dataUrl,
            originalFileName: processed.fileName,
            originalFileType: processed.fileType,
            originalWidth: processed.width,
            originalHeight: processed.height,
            detectedFace: faceBox,
            crop: smartCrop,
            croppedImageUrl: croppedJpeg,
            isAiCropped: true,
          };
        } else if (projectType === 'group') {
          // Add extra student for remaining files
          updatedStudents.push({
            id: `s-${Date.now()}-${i}`,
            indexNumber: '',
            name: '',
            isLeader: false,
            originalImageUrl: processed.dataUrl,
            originalFileName: processed.fileName,
            originalFileType: processed.fileType,
            originalWidth: processed.width,
            originalHeight: processed.height,
            detectedFace: faceBox,
            crop: smartCrop,
            croppedImageUrl: croppedJpeg,
            isAiCropped: true,
          });
        }
      } catch (err) {
        console.error(`Failed to batch process file #${i + 1}`, err);
      }
    }

    onUpdateStudents(updatedStudents);
  };

  // Load sample group
  const handleLoadSample = () => {
    if (projectType === 'group') {
      onUpdateStudents(JSON.parse(JSON.stringify(SAMPLE_STUDENTS)));
    } else {
      const sampleOne = JSON.parse(JSON.stringify(SAMPLE_STUDENTS[0]));
      sampleOne.isLeader = false;
      onUpdateStudents([sampleOne]);
    }
  };

  // Clear all
  const handleClearAll = () => {
    if (confirm('Clear all student inputs and photos?')) {
      onUpdateStudents([
        {
          id: `s-${Date.now()}-1`,
          indexNumber: '',
          name: '',
          isLeader: projectType === 'group',
          originalImageUrl: null,
          crop: { x: 0, y: 0, width: 0, height: 0, zoom: 1, rotation: 0, flipH: false, flipV: false },
          croppedImageUrl: null,
          isAiCropped: false,
        },
      ]);
    }
  };

  return (
    <div className="student-list-container">
      {/* Hidden batch file input */}
      <input
        type="file"
        ref={batchFileInputRef}
        style={{ display: 'none' }}
        multiple
        accept="image/*,.heic,.heif"
        onChange={(e) => handleBatchUpload(e.target.files)}
      />

      {/* Control bar: Project Type Toggle & Actions */}
      <div className="list-controls-bar">
        {/* Project Type Switcher */}
        <div className="project-type-selector">
          <button
            type="button"
            className={`type-tab ${projectType === 'group' ? 'active' : ''}`}
            onClick={() => handleTypeChange('group')}
          >
            <Users size={16} />
            <span>Group Project</span>
            <span className="type-badge">Leader + Members</span>
          </button>
          <button
            type="button"
            className={`type-tab ${projectType === 'individual' ? 'active' : ''}`}
            onClick={() => handleTypeChange('individual')}
          >
            <User size={16} />
            <span>Individual Project</span>
            <span className="type-badge">Single Photo</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="list-actions-cluster">
          <button
            type="button"
            className="action-pill-btn batch-btn"
            onClick={() => batchFileInputRef.current?.click()}
            title="Upload multiple photos in one go"
          >
            <UploadCloud size={15} />
            <span>Batch Upload Photos</span>
          </button>

          <button
            type="button"
            className="action-pill-btn sample-btn"
            onClick={handleLoadSample}
            title="Load demo guideline compliant data"
          >
            <Sparkles size={15} />
            <span>Load Sample Data</span>
          </button>

          <button
            type="button"
            className="action-pill-btn danger-btn"
            onClick={handleClearAll}
            title="Clear all student details"
          >
            <Trash2 size={15} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Order Reminder Banner for Group Project */}
      {projectType === 'group' && (
        <div className="order-spec-banner">
          <FileCheck2 size={16} className="banner-icon" />
          <div className="banner-text">
            <strong>Rule Reminder:</strong> Arrange members in the{' '}
            <span className="highlight">exact same order</span> as listed in your{' '}
            <strong>Final Year Project Details Form</strong>. Member #1 is automatically designated as the{' '}
            <strong>Group Leader</strong>.
          </div>
        </div>
      )}

      {/* Students Cards Grid */}
      <div className="student-cards-grid">
        {students.map((student, idx) => (
          <StudentCard
            key={student.id}
            student={student}
            index={idx}
            totalStudents={students.length}
            isGroupProject={projectType === 'group'}
            onUpdate={handleUpdateStudent}
            onRemove={handleRemoveStudent}
            onMove={handleMoveStudent}
            onOpenCropper={onOpenCropper}
          />
        ))}

        {/* Add Member Card (Group Project Only) */}
        {projectType === 'group' && students.length < 8 && (
          <div className="add-member-card" onClick={handleAddMember}>
            <div className="add-icon-ring">
              <Plus size={24} />
            </div>
            <span className="add-card-title">Add Group Member</span>
            <span className="add-card-subtitle">Member #{students.length + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
};
