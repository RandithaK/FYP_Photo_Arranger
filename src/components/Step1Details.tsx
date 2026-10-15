import React from 'react';
import type { Student, ProjectType } from '../types';
import {
  sanitizeIndexNumber,
  normalizeNameWithInitials,
  getDetailErrors,
  detailsComplete
} from '../utils/validation';
import {
  Users,
  User,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Crown,
  ArrowRight
} from 'lucide-react';

interface Step1DetailsProps {
  projectType: ProjectType;
  students: Student[];
  onProjectTypeChange: (type: ProjectType) => void;
  onUpdateStudents: (students: Student[]) => void;
  onNext: () => void;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({
  projectType,
  students,
  onProjectTypeChange,
  onUpdateStudents,
  onNext,
}) => {
  const isGroup = projectType === 'group';
  const errors = getDetailErrors(students);
  const isComplete = detailsComplete(students);

  const handleModeSwitch = (newType: ProjectType) => {
    if (newType === projectType) return;
    onProjectTypeChange(newType);

    if (newType === 'individual') {
      onUpdateStudents(students.slice(0, 1));
    } else if (students.length === 1) {
      onUpdateStudents([
        students[0],
        { id: `s-${Date.now()}-2`, indexNumber: '', name: '', photo: null },
      ]);
    }
  };

  const updateStudent = (id: string, patch: Partial<Student>) => {
    onUpdateStudents(
      students.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const handleIndexChange = (id: string, val: string) => {
    updateStudent(id, { indexNumber: sanitizeIndexNumber(val) });
  };

  const handleNameBlur = (id: string, val: string) => {
    updateStudent(id, { name: normalizeNameWithInitials(val) });
  };

  const moveStudent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= students.length) return;
    const copy = [...students];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    onUpdateStudents(copy);
  };

  const addMember = () => {
    if (students.length >= 8) return;
    onUpdateStudents([
      ...students,
      { id: `s-${Date.now()}`, indexNumber: '', name: '', photo: null },
    ]);
  };

  const removeMember = (id: string) => {
    if (students.length <= 1) return;
    onUpdateStudents(students.filter((s) => s.id !== id));
  };

  return (
    <div className="step-card">
      <div className="step-card-header">
        <div>
          <h2>Step 1: Student Details</h2>
          <p className="step-card-desc">
            {isGroup
              ? 'Arrange members in the exact order of your FYP Details Form. Member #1 is the Group Leader.'
              : 'Enter your index number and name with initials as registered.'}
          </p>
        </div>

        {/* Project Type Switcher */}
        <div className="type-toggle-group">
          <button
            type="button"
            className={`type-toggle-btn ${isGroup ? 'active' : ''}`}
            onClick={() => handleModeSwitch('group')}
          >
            <Users size={16} />
            <span>Group</span>
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${!isGroup ? 'active' : ''}`}
            onClick={() => handleModeSwitch('individual')}
          >
            <User size={16} />
            <span>Individual</span>
          </button>
        </div>
      </div>

      {/* Student List Table */}
      <div className="student-input-list">
        {students.map((student, idx) => {
          const isLeader = isGroup && idx === 0;
          const err = errors[idx] || {};

          return (
            <div key={student.id} className={`student-row ${isLeader ? 'leader-row' : ''}`}>
              <div className="row-order-cell">
                <span className="order-tag">#{idx + 1}</span>
                {isLeader && (
                  <span className="leader-badge" title="First member must be the Group Leader">
                    <Crown size={12} />
                    <span>Leader</span>
                  </span>
                )}
              </div>

              <div className="row-inputs-cell">
                <div className="input-group">
                  <label>Index Number (No spaces)</label>
                  <input
                    type="text"
                    placeholder="e.g. 214001A"
                    value={student.indexNumber}
                    onChange={(e) => handleIndexChange(student.id, e.target.value)}
                    className={err.indexNumber ? 'input-error' : ''}
                  />
                  {err.indexNumber && <span className="field-error-msg">{err.indexNumber}</span>}
                </div>

                <div className="input-group">
                  <label>Name with Initials</label>
                  <input
                    type="text"
                    placeholder="e.g. A.B.C. Perera"
                    value={student.name}
                    onChange={(e) => updateStudent(student.id, { name: e.target.value })}
                    onBlur={(e) => handleNameBlur(student.id, e.target.value)}
                    className={err.name ? 'input-error' : ''}
                  />
                  {err.name && <span className="field-error-msg">{err.name}</span>}
                </div>
              </div>

              {isGroup && (
                <div className="row-actions-cell">
                  <button
                    type="button"
                    className="icon-btn-round"
                    disabled={idx === 0}
                    onClick={() => moveStudent(idx, idx - 1)}
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn-round"
                    disabled={idx === students.length - 1}
                    onClick={() => moveStudent(idx, idx + 1)}
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  {students.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn-round danger"
                      onClick={() => removeMember(student.id)}
                      title="Remove student"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isGroup && students.length < 8 && (
        <button type="button" className="btn btn-dashed" onClick={addMember}>
          <Plus size={16} />
          <span>Add Member (#{students.length + 1})</span>
        </button>
      )}

      {/* Step Navigation */}
      <div className="step-footer">
        <span className="step-status-hint">
          {isComplete ? 'All details filled.' : 'Please fill all required index numbers and names.'}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!isComplete}
          onClick={onNext}
        >
          <span>Next: Upload Photos</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
