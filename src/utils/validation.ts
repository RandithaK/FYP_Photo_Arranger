import type { Student } from '../types';

/** Index numbers must not contain any spaces (guideline §2). */
export function sanitizeIndexNumber(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalises a "name with initials" without guessing:
 *   "a. b. c. perera" -> "A.B.C. Perera"
 *   "A B C Perera"    -> "A.B.C. Perera"
 *   "A.B.C.Perera"    -> "A.B.C. Perera"
 *   "A.B. De Silva"   -> "A.B. De Silva"   (multi-word surnames are preserved)
 * Only leading single-letter / dotted tokens are treated as initials; the last
 * word is never treated as an initial, and full words are left as typed
 * (except an all-lowercase surname, which gets capitalised).
 */
export function normalizeNameWithInitials(input: string): string {
  // Split "A.B.C.Perera" into "A.B.C." + "Perera"
  const spaced = input.replace(/^((?:[A-Za-z]\.)+)(?=[A-Za-z]{2,})/, '$1 ');
  const tokens = spaced.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  const initials: string[] = [];
  let i = 0;
  for (; i < tokens.length - 1; i++) {
    const t = tokens[i];
    const isInitialToken = /^(?:[A-Za-z]\.?)+$/.test(t) && (t.includes('.') || t.length === 1);
    if (!isInitialToken) break;
    initials.push(...t.replace(/\./g, '').toUpperCase().split(''));
  }

  let rest = tokens.slice(i).join(' ');
  if (rest === rest.toLowerCase()) {
    rest = rest.replace(/(^|\s)([a-z])/g, (_, sp: string, c: string) => sp + c.toUpperCase());
  }
  return initials.length ? `${initials.map((c) => `${c}.`).join('')} ${rest}` : rest;
}

export interface DetailErrors {
  indexNumber?: string;
  name?: string;
}

export function getDetailErrors(students: Student[]): DetailErrors[] {
  const counts = new Map<string, number>();
  for (const s of students) {
    if (s.indexNumber) counts.set(s.indexNumber, (counts.get(s.indexNumber) ?? 0) + 1);
  }
  return students.map((s) => {
    const e: DetailErrors = {};
    if (!s.indexNumber) e.indexNumber = 'Required';
    else if ((counts.get(s.indexNumber) ?? 0) > 1) e.indexNumber = 'Duplicate index number';
    if (!s.name.trim()) e.name = 'Required';
    return e;
  });
}

export function detailsComplete(students: Student[]): boolean {
  return (
    students.length > 0 &&
    getDetailErrors(students).every((e) => !e.indexNumber && !e.name)
  );
}

export function photosComplete(students: Student[]): boolean {
  return students.length > 0 && students.every((s) => s.photo);
}
