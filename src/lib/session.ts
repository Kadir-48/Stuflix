import { StudentSession } from '../types';

const STORAGE_KEY = 'stuflix_student_session';
const LEGACY_STORAGE_KEY = 'studyhub_student_session';

const AVATAR_COLORS = [
  '#2563eb', // blue
  '#0d9488', // teal
  '#16a34a', // green
  '#ca8a04', // amber
  '#ea580c', // orange
  '#e11d48', // rose
  '#9333ea', // purple
  '#0284c7', // sky
];

export function getStoredSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.studentId && data.studentName) {
      return data as StudentSession;
    }
  } catch {
    // Ignore JSON errors
  }
  return null;
}

export function saveSession(studentName: string, existingId?: string): StudentSession {
  const trimmed = studentName.trim();
  const studentId = existingId || `stu_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  const colorIndex = Math.abs(studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  const session: StudentSession = {
    studentId,
    studentName: trimmed,
    avatarColor,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage full or restricted
  }

  return session;
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
