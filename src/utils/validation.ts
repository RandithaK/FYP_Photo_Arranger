import { Student, ProjectConfig, ProjectValidation, StudentValidation, ValidationItem } from '../types';

/**
 * Validates a student's index number according to PDF rules:
 * - "Do not leave any spaces around the index number."
 * - Typically alphanumeric, e.g., 214001A
 */
export function validateIndexNumber(indexNumber: string): { isValid: boolean; hasSpaces: boolean; message?: string } {
  const trimmed = indexNumber.trim();
  if (!trimmed) {
    return { isValid: false, hasSpaces: false, message: 'Index number is required' };
  }

  // Check for any spaces (internal or external)
  const hasSpaces = /\s/.test(indexNumber);
  if (hasSpaces) {
    return {
      isValid: false,
      hasSpaces: true,
      message: 'Violation: Do not leave any spaces around or within the index number (e.g. use "214001A")'
    };
  }

  // Typically 6 or 7 digits followed by a letter, or general university format
  const pattern = /^[0-9]{5,8}[A-Za-z]?$/;
  if (!pattern.test(indexNumber)) {
    return {
      isValid: true, // Allow custom formats, but note
      hasSpaces: false,
      message: 'Notice: Format is usually like 214001A (check your university ID card)'
    };
  }

  return { isValid: true, hasSpaces: false };
}

/**
 * Validates a student's name with initials according to PDF rules:
 * - Example: "A.B.C. Perera"
 */
export function validateStudentName(name: string): { isValid: boolean; message?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Student name with initials is required' };
  }

  // Check if it looks like initials + surname (e.g., "A.B.C. Perera" or "A. B. C. Perera")
  const hasInitialsPattern = /^([A-Z]\.?\s*)+[A-Z][a-zA-Z'\- ]+$/i;
  if (!hasInitialsPattern.test(trimmed)) {
    return {
      isValid: true,
      message: 'Recommended format: Name with initials (e.g. "A.B.C. Perera")'
    };
  }

  return { isValid: true };
}

/**
 * Auto-formats names into proper standard "A.B.C. Surname" style
 */
export function formatStudentNameWithInitials(input: string): string {
  const clean = input.trim();
  if (!clean) return '';

  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    // Single word, capitalize first letter
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  // If last part is surname and preceding parts are initials
  const surname = parts[parts.length - 1];
  const capitalizedSurname = surname.charAt(0).toUpperCase() + surname.slice(1).toLowerCase();

  const initials = parts.slice(0, parts.length - 1).map(p => {
    // Remove periods and take first char
    const letter = p.replace(/\./g, '').charAt(0).toUpperCase();
    return letter ? `${letter}.` : '';
  }).filter(Boolean).join('');

  return initials ? `${initials} ${capitalizedSurname}` : capitalizedSurname;
}

/**
 * Sanitizes index number by stripping any whitespace and uppercasing
 */
export function sanitizeIndexNumber(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Validates an individual student against all guideline criteria
 */
export function validateStudent(student: Student, index: number, projectType: string): StudentValidation {
  const issues: ValidationItem[] = [];

  // Check photo
  const hasPhoto = Boolean(student.originalImageUrl && (student.croppedImageUrl || student.originalImageUrl));
  if (!hasPhoto) {
    issues.push({
      type: 'error',
      field: 'photo',
      message: 'Photo is missing. Upload a formal headshot.'
    });
  }

  // Check index number
  const indexCheck = validateIndexNumber(student.indexNumber);
  const indexNumberHasNoSpaces = !indexCheck.hasSpaces;
  const indexNumberValid = indexCheck.isValid && student.indexNumber.trim().length > 0;

  if (!student.indexNumber.trim()) {
    issues.push({
      type: 'error',
      field: 'indexNumber',
      message: 'Index number is missing.'
    });
  } else if (indexCheck.hasSpaces) {
    issues.push({
      type: 'error',
      field: 'indexNumber',
      message: indexCheck.message || 'Spaces detected in index number.'
    });
  }

  // Check name
  const nameCheck = validateStudentName(student.name);
  const nameValid = nameCheck.isValid && student.name.trim().length > 0;
  if (!student.name.trim()) {
    issues.push({
      type: 'error',
      field: 'name',
      message: 'Student name is missing.'
    });
  } else if (nameCheck.message) {
    issues.push({
      type: 'warning',
      field: 'name',
      message: nameCheck.message
    });
  }

  // Check leader in group project
  if (projectType === 'group' && index === 0 && !student.isLeader) {
    issues.push({
      type: 'warning',
      field: 'isLeader',
      message: 'First member should be marked as Group Leader.'
    });
  }

  return {
    studentId: student.id,
    hasPhoto,
    isHeadshotCropped: Boolean(student.croppedImageUrl),
    indexNumberValid,
    indexNumberHasNoSpaces,
    nameValid,
    issues,
  };
}

/**
 * Validates the entire project against all guidelines
 */
export function validateProject(config: ProjectConfig): ProjectValidation {
  const overallIssues: ValidationItem[] = [];
  const studentValidations: Record<string, StudentValidation> = {};

  if (config.students.length === 0) {
    overallIssues.push({
      type: 'error',
      message: 'Please add at least one student.'
    });
  }

  let allPhotos = true;
  let allDetails = true;

  config.students.forEach((student, index) => {
    const val = validateStudent(student, index, config.projectType);
    studentValidations[student.id] = val;

    if (!val.hasPhoto) allPhotos = false;
    if (!val.indexNumberValid || !val.nameValid || !val.indexNumberHasNoSpaces) allDetails = false;

    val.issues.forEach(issue => {
      if (issue.type === 'error') {
        overallIssues.push({
          type: 'error',
          message: `Student #${index + 1} (${student.indexNumber || 'Unnamed'}): ${issue.message}`
        });
      }
    });
  });

  const leaderSpecified = config.projectType === 'individual'
    ? true
    : Boolean(config.students.length > 0 && config.students[0].isLeader);

  const isValid = overallIssues.filter(i => i.type === 'error').length === 0 && config.students.length > 0;

  return {
    isValid,
    leaderSpecified,
    hasStudents: config.students.length > 0,
    allPhotosUploaded: allPhotos,
    allDetailsFilled: allDetails,
    studentValidations,
    overallIssues,
  };
}
