export interface Room {
  id: string;
  name: string;
  password: string;
  ownerName: string;
  isLocked: boolean;
  createdAt: number;
  avatarColor?: string;
  avatarIcon?: string;
  activeCount?: number;
}

export type PresenceStatus = 'online' | 'offline' | 'away' | 'in_call' | 'studying';

export interface UserStatus {
  presence: PresenceStatus;
  activity: string; // e.g. "📚 Studying", "🚫 Do Not Disturb"
  customText?: string;
  updatedAt?: number;
}

export interface RoomMember {
  sessionId: string;
  socketId?: string;
  studentName: string;
  color?: string;
  isOwner?: boolean;
  isHost?: boolean;
  inCall?: boolean;
  isCameraOn?: boolean;
  isMicOn?: boolean;
  isScreenSharing?: boolean;
  isSpeaking?: boolean;
  networkQuality?: 'good' | 'medium' | 'poor';
  isTyping?: boolean;
  status?: UserStatus;
}

export interface StudentSession {
  sessionId?: string;
  studentId?: string;
  studentName: string;
  avatarColor?: string;
  createdAt?: number;
  status?: UserStatus;
}

export interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of student names
}

export interface Poll {
  id: string;
  roomId: string;
  authorName: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  createdAt: number;
  closed?: boolean;
}

export interface ChatMessage {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
  replyTo?: {
    id: string;
    authorName: string;
    content: string;
  };
  attachment?: {
    name: string;
    type: string;
    size: string;
    dataUrl: string;
  };
  pollId?: string;
  poll?: Poll;
  reactions?: Record<string, string[]>;
  isPinned?: boolean;
  edited?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  lastEditedBy: string;
  updatedAt: string;
}

export interface SharedFile {
  id: string;
  name: string;
  type: string;
  size: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TimetableEntry {
  id: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  createdBy: string;
}

export interface CallMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  serverUrl?: string;
  configured: boolean;
  isUrlValid?: boolean;
  missingVariables?: string[];
  participantIdentity?: string;
  participantName?: string;
  roomName?: string;
  iceServers?: RTCIceServer[];
}

export interface LiveKitStatusResponse {
  configured: boolean;
  livekitUrl: string;
  urlConfigured: boolean;
  url: string | null;
  apiKeyConfigured: boolean;
  apiKeyMasked: string | null;
  apiSecretConfigured: boolean;
  apiSecretMasked: string | null;
  isDemoUrl: boolean;
  isDevKey: boolean;
  missingVariables?: string[];
  turnStatus: {
    customTurnConfigured: boolean;
    turnUrl: string | null;
    turnUsernameConfigured: boolean;
    googleStunConfigured: boolean;
  };
  diagnostics: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: string;
  }[];
  crossNetworkReady: boolean;
}

export type WhiteboardTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  tool: WhiteboardTool;
  color: string;
  width: number;
  points: WhiteboardPoint[];
  text?: string;
  authorName: string;
  timestamp: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
}

// Exam Difficulty Rating System
export type ExamDifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface ExamRatingReview {
  id: string;
  studentName: string;
  rating: ExamDifficultyLevel; // 1: Easy, 2: Moderate, 3: Challenging, 4: Hard, 5: Very Hard
  comment?: string;
  createdAt: number;
}

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  code?: string;
  examDate?: string;
  ratings: ExamRatingReview[];
  averageRating: number;
  totalVotes: number;
  createdAt: number;
}

// Study Analytics Dashboard
export interface StudySessionLog {
  id: string;
  subject: string;
  durationMinutes: number;
  timestamp: number;
  focusScore?: number;
  notes?: string;
  soundUsed?: string;
}

export interface SubjectBreakdown {
  subject: string;
  minutes: number;
  hours: number;
  percentage: number;
  color: string;
}

export interface SoundUsageAnalytics {
  totalSessionsWithAudio: number;
  soundPlayCounts: Record<string, number>;
  mostUsedSound?: string;
  preferredEnvironment?: string;
}

export interface StudentAnalytics {
  studentName: string;
  totalStudyMinutes: number;
  dailyStudyMinutes: number;
  weeklyStudyMinutes: number;
  monthlyStudyMinutes: number;
  focusSessionsCompleted: number;
  goalsCompleted: number;
  currentStreakDays: number;
  longestStreakDays: number;
  subjectBreakdown: Record<string, number>;
  dailyHistory: { date: string; dayLabel: string; minutes: number }[];
  recentSessions: StudySessionLog[];
  soundAnalytics?: SoundUsageAnalytics;
}

// Focus Sounds & Study Ambience
export type SoundCategory = 'nature' | 'ambient' | 'music' | 'focus';

export interface SoundItem {
  id: string;
  title: string;
  category: SoundCategory;
  icon: string;
  description: string;
  recommendedSubject?: string;
}

export interface SoundPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  sounds: { soundId: string; volume: number }[];
}

export interface AppSettings {
  soundNotificationsEnabled: boolean;
  timerChimeEnabled: boolean;
  soundEffectsVolume: number;
  theme: 'dark' | 'light';
}

