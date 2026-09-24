import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { AccessToken } from 'livekit-server-sdk';
import { createServer as createViteServer } from 'vite';
import {
  Room,
  RoomMember,
  ChatMessage,
  Note,
  SharedFile,
  TimetableEntry,
  LiveKitStatusResponse,
  WhiteboardStroke,
  KanbanTask,
  Poll,
  ExamPaper,
  ExamRatingReview,
  StudentAnalytics,
  StudySessionLog,
  UserStatus,
} from './src/types';
import {
  initializeStorage,
  saveRoom as persistRoomToDb,
  deleteRoom as deleteRoomFromDb,
  addMessage as persistMessageToDb,
  updateMessage as updateMessageInDb,
  deleteMessage as deleteMessageFromDb,
  saveNote as persistNoteToDb,
  deleteNote as deleteNoteFromDb,
  saveFile as persistFileToDb,
  deleteFile as deleteFileFromDb,
  saveTimetable as persistTimetableToDb,
  deleteTimetable as deleteTimetableFromDb,
  saveTask as persistTaskToDb,
  deleteTask as deleteTaskFromDb,
  savePoll as persistPollToDb,
  addWhiteboardStroke as persistWhiteboardStrokeToDb,
  clearRoomWhiteboard as clearWhiteboardFromDb,
  saveStudentAnalytics as persistAnalyticsToDb,
  createSnapshotBackup,
  listBackups,
  restoreFromBackup,
  getAllRooms,
  getRoomMessages,
  getRoomNotes,
  getRoomFiles,
  getRoomTimetables,
  getRoomWhiteboard,
  getRoomTasks,
  getRoomPolls,
  getRoomMembers,
  getStudentAnalytics,
} from './src/db/storage.ts';

dotenv.config({ override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---------------------------------------------------------------------------
// IN-MEMORY DATABASE & DATA STORES
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>();
const roomMessages = new Map<string, ChatMessage[]>();
const roomNotes = new Map<string, Note[]>();
const roomFiles = new Map<string, SharedFile[]>();
const roomTimetables = new Map<string, TimetableEntry[]>();
const roomWhiteboards = new Map<string, WhiteboardStroke[]>();
const roomTasks = new Map<string, KanbanTask[]>();
const roomMembers = new Map<string, Map<string, RoomMember>>(); // roomId -> Map<sessionId, RoomMember>
const roomPolls = new Map<string, Poll[]>();
const examPapers = new Map<string, ExamPaper>();
const studentAnalyticsStore = new Map<string, StudentAnalytics>();
const socketSessionMap = new Map<string, { roomId: string; sessionId: string }>();

// Seed default room: "10th Math Board Exam Prep"
const DEFAULT_ROOM_ID = 'room_board_math_01';
const initialRoom: Room = {
  id: DEFAULT_ROOM_ID,
  name: '10th Math Board Exam Prep',
  password: 'study10',
  ownerName: 'Arjun Sharma',
  isLocked: false,
  createdAt: Date.now() - 3600000 * 24,
  avatarColor: 'blue',
  avatarIcon: 'calculator',
};

rooms.set(DEFAULT_ROOM_ID, initialRoom);
roomMessages.set(DEFAULT_ROOM_ID, [
  {
    id: 'msg_init_1',
    authorName: 'Arjun Sharma',
    content: 'Welcome everyone to the 10th Math Board Exam study room! Let us review quadratic formulas and solved papers.',
    timestamp: '10:15 AM',
    reactions: { '👍': ['Arjun Sharma'], '🎯': ['Arjun Sharma'] },
    isPinned: true,
  },
  {
    id: 'msg_init_2',
    authorName: 'Priya Patel',
    content: 'Uploaded the 2024 sample paper and notes in the Files tab for everyone to download.',
    timestamp: '10:20 AM',
    reactions: { '❤️': ['Arjun Sharma'] },
  },
]);

roomNotes.set(DEFAULT_ROOM_ID, [
  {
    id: 'note_init_1',
    title: 'Quadratic Equations & Roots Summary',
    content: `# Quadratic Equations Formulas & Tips

1. Standard Form:
   $$ax^2 + bx + c = 0$$

2. Quadratic Formula:
   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

3. Nature of Roots (Discriminant $D = b^2 - 4ac$):
   - $D > 0$: Two distinct real roots
   - $D = 0$: Two equal real roots (repeated)
   - $D < 0$: No real roots

4. Relation between roots:
   - Sum of roots: $\\alpha + \\beta = -b/a$
   - Product of roots: $\\alpha\\beta = c/a$

*Feel free to add practice questions below!*`,
    lastEditedBy: 'Arjun Sharma',
    updatedAt: '10:25 AM',
  },
]);

roomFiles.set(DEFAULT_ROOM_ID, [
  {
    id: 'file_init_1',
    name: 'Mathematics_0607_Sample_Paper.pdf',
    type: 'application/pdf',
    size: '1.2 MB',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg==',
    uploadedBy: 'Priya Patel',
    uploadedAt: '10:20 AM',
  },
]);

const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

roomTimetables.set(DEFAULT_ROOM_ID, [
  {
    id: 'tt_init_1',
    subject: 'Mathematics 0607 (Paper 2)',
    date: tomorrow,
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    createdBy: 'Arjun Sharma',
  },
  {
    id: 'tt_init_2',
    subject: 'Physics 0625 (Theory)',
    date: nextWeek,
    startTime: '11:15 AM',
    endTime: '01:15 PM',
    createdBy: 'Priya Patel',
  },
]);

roomTasks.set(DEFAULT_ROOM_ID, [
  {
    id: 'task_init_1',
    title: 'Solve 2023 Paper 2 Section B',
    description: 'Work through questions 8 to 14 focusing on quadratic equation word problems.',
    status: 'todo',
    priority: 'high',
    assignee: 'Arjun Sharma',
    dueDate: tomorrow,
    tags: ['Paper2', 'Algebra'],
    createdBy: 'Arjun Sharma',
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'task_init_2',
    title: 'Review Trigonometry Identities & Unit Circle',
    description: 'Prepare quick flashcard summary for sin, cos, and tan angle values.',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Priya Patel',
    dueDate: tomorrow,
    tags: ['Trigonometry', 'Formulas'],
    createdBy: 'Priya Patel',
    createdAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'task_init_3',
    title: 'Download & print 2024 sample question paper',
    description: 'Saved into room Files tab for all members to access.',
    status: 'completed',
    priority: 'low',
    assignee: 'Priya Patel',
    tags: ['Resources'],
    createdBy: 'Priya Patel',
    createdAt: Date.now() - 3600000 * 2,
  },
]);

roomMembers.set(DEFAULT_ROOM_ID, new Map());

// Seed initial WhatsApp-style poll for the default room
const initialPoll: Poll = {
  id: 'poll_exam_physics_01',
  roomId: DEFAULT_ROOM_ID,
  authorName: 'Arjun Sharma',
  question: "How was today's Physics exam?",
  options: [
    { id: 'opt_1', text: '🟢 Easy', votes: ['Rohan Das'] },
    { id: 'opt_2', text: '🟡 Moderate', votes: ['Aarav Gupta', 'Sneha Rao', 'Pooja Verma'] },
    { id: 'opt_3', text: '🟠 Hard', votes: ['Arjun Sharma', 'Priya Patel', 'Vikram Malhotra', 'Ananya Sen', 'Kavita Nair'] },
    { id: 'opt_4', text: '🔴 Very Hard', votes: ['Dev Patel', 'Simran Kaur'] },
  ],
  allowMultiple: false,
  isAnonymous: false,
  createdAt: Date.now() - 3600000 * 2,
};
roomPolls.set(DEFAULT_ROOM_ID, [initialPoll]);

// Append initial poll message to chat so it appears inline
const initialMsgs = roomMessages.get(DEFAULT_ROOM_ID) || [];
initialMsgs.push({
  id: 'msg_poll_' + initialPoll.id,
  authorName: 'Arjun Sharma',
  content: `📊 Poll: ${initialPoll.question}`,
  timestamp: '10:30 AM',
  pollId: initialPoll.id,
  poll: initialPoll,
});
roomMessages.set(DEFAULT_ROOM_ID, initialMsgs);

// Exam Difficulty Rating System store (starts completely empty, real user-created exams only)
// examPapers is initialized as empty Map<string, ExamPaper>()

// Helper: Get or initialize Student Study Analytics (Pure real data from database records)
function getOrCreateStudentAnalytics(studentName: string): StudentAnalytics {
  const cleanName = studentName.trim();
  const existing = studentAnalyticsStore.get(cleanName);
  if (existing) return existing;

  const emptyAnalytics: StudentAnalytics = {
    studentName: cleanName,
    totalStudyMinutes: 0,
    dailyStudyMinutes: 0,
    weeklyStudyMinutes: 0,
    monthlyStudyMinutes: 0,
    focusSessionsCompleted: 0,
    goalsCompleted: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    subjectBreakdown: {},
    dailyHistory: [],
    recentSessions: [],
  };

  studentAnalyticsStore.set(cleanName, emptyAnalytics);
  return emptyAnalytics;
}


// ---------------------------------------------------------------------------
// PERMANENT DATABASE STORAGE & DISK PERSISTENCE
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const PRIMARY_DATA_FILE = path.join(DATA_DIR, 'stuflix_store.json');
const LEGACY_DATA_FILE = path.join(DATA_DIR, 'studyhub_store.json');

function saveDatabaseToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = {
      rooms: Array.from(rooms.entries()),
      roomMessages: Array.from(roomMessages.entries()),
      roomNotes: Array.from(roomNotes.entries()),
      roomFiles: Array.from(roomFiles.entries()),
      roomTimetables: Array.from(roomTimetables.entries()),
      roomWhiteboards: Array.from(roomWhiteboards.entries()),
      roomTasks: Array.from(roomTasks.entries()),
      roomMembers: Array.from(roomMembers.entries()).map(([roomId, membersMap]) => [
        roomId,
        Array.from(membersMap.values()),
      ]),
      roomPolls: Array.from(roomPolls.entries()),
      examPapers: Array.from(examPapers.entries()),
      studentAnalytics: Array.from(studentAnalyticsStore.entries()),
      savedAt: Date.now(),
    };

    const jsonString = JSON.stringify(serialized, null, 2);
    // Atomic safe write to avoid file corruption during rapid updates or server restarts
    const tmpFile = PRIMARY_DATA_FILE + '.tmp';
    fs.writeFileSync(tmpFile, jsonString, 'utf-8');
    fs.renameSync(tmpFile, PRIMARY_DATA_FILE);

    // Keep legacy data file synchronized for backwards compatibility
    try {
      fs.writeFileSync(LEGACY_DATA_FILE, jsonString, 'utf-8');
    } catch {
      // Safe non-blocking fallback
    }
  } catch (err) {
    console.error('Failed to save room store to disk:', err);
  }
}

// Immediate database save on all mutations
function scheduleDatabaseSave() {
  saveDatabaseToDisk();
}

function loadDatabaseFromDisk() {
  try {
    const fileToLoad = fs.existsSync(PRIMARY_DATA_FILE)
      ? PRIMARY_DATA_FILE
      : fs.existsSync(LEGACY_DATA_FILE)
      ? LEGACY_DATA_FILE
      : null;

    if (fileToLoad) {
      const raw = fs.readFileSync(fileToLoad, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.rooms)) {
        for (const [id, r] of parsed.rooms) {
          if (id && r) rooms.set(id, r);
        }
      }
      if (Array.isArray(parsed.roomMessages)) {
        for (const [id, msgs] of parsed.roomMessages) {
          if (id && Array.isArray(msgs)) roomMessages.set(id, msgs);
        }
      }
      if (Array.isArray(parsed.roomNotes)) {
        for (const [id, notes] of parsed.roomNotes) {
          if (id && Array.isArray(notes)) roomNotes.set(id, notes);
        }
      }
      if (Array.isArray(parsed.roomFiles)) {
        for (const [id, files] of parsed.roomFiles) {
          if (id && Array.isArray(files)) roomFiles.set(id, files);
        }
      }
      if (Array.isArray(parsed.roomTimetables)) {
        for (const [id, tts] of parsed.roomTimetables) {
          if (id && Array.isArray(tts)) roomTimetables.set(id, tts);
        }
      }
      if (Array.isArray(parsed.roomWhiteboards)) {
        for (const [id, wbs] of parsed.roomWhiteboards) {
          if (id && Array.isArray(wbs)) roomWhiteboards.set(id, wbs);
        }
      }
      if (Array.isArray(parsed.roomTasks)) {
        for (const [id, tasks] of parsed.roomTasks) {
          if (id && Array.isArray(tasks)) roomTasks.set(id, tasks);
        }
      }
      if (Array.isArray(parsed.roomMembers)) {
        for (const [id, membersList] of parsed.roomMembers) {
          if (id && Array.isArray(membersList)) {
            const map = new Map<string, RoomMember>();
            for (const m of membersList) {
              if (m && (m.sessionId || m.socketId)) {
                // Restore persistent member info while marking offline until client connects
                map.set(m.sessionId || m.socketId, {
                  ...m,
                  socketId: undefined,
                  inCall: false,
                  isSpeaking: false,
                  isTyping: false,
                  status: m.status
                    ? { ...m.status, presence: 'offline' }
                    : { presence: 'offline', activity: 'Offline' },
                });
              }
            }
            roomMembers.set(id, map);
          }
        }
      }
      if (Array.isArray(parsed.roomPolls)) {
        for (const [id, polls] of parsed.roomPolls) {
          if (id && Array.isArray(polls)) roomPolls.set(id, polls);
        }
      }
      if (Array.isArray(parsed.examPapers)) {
        for (const [id, exam] of parsed.examPapers) {
          if (id && exam) examPapers.set(id, exam);
        }
      }
      if (Array.isArray(parsed.studentAnalytics)) {
        for (const [name, ana] of parsed.studentAnalytics) {
          if (name && ana) studentAnalyticsStore.set(name, ana);
        }
      }
      console.log(`[Storage] Restored ${rooms.size} permanent study room(s), data records, and member lists from persistent disk storage.`);
    }
  } catch (err) {
    console.error('Failed to load study room store from disk:', err);
  }
}

// Restore persisted data on startup
loadDatabaseFromDisk();

// ---------------------------------------------------------------------------
// REST API ENDPOINTS
// ---------------------------------------------------------------------------

// Create Room
app.post('/api/rooms/create', (req, res) => {
  const { name, password, studentName, creatorName, authorName, sessionId } = req.body;
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPass = typeof password === 'string' ? password.trim() : '';
  const rawStudent = studentName || creatorName || authorName || '';
  const cleanStudent = typeof rawStudent === 'string' ? rawStudent.trim() : '';

  if (!cleanName || !cleanPass || !cleanStudent) {
    return res.status(400).json({
      success: false,
      error: 'Room name, password, and student name are all required.',
    });
  }

  if (cleanName.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Room name must be at least 2 characters long.',
    });
  }

  if (cleanPass.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Room password must be at least 3 characters long.',
    });
  }

  if (cleanStudent.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Student name must be at least 2 characters long.',
    });
  }

  // Check if room with identical password already exists (passwords act as permanent room access codes)
  for (const existing of rooms.values()) {
    if (existing.password.toLowerCase() === cleanPass.toLowerCase() || existing.password === cleanPass) {
      return res.status(400).json({
        success: false,
        error: 'A room with this password/access code already exists. Please choose a different password.',
      });
    }
  }

  const roomId = 'room_' + Math.random().toString(36).substring(2, 9);
  const avatarColor = typeof req.body.avatarColor === 'string' && req.body.avatarColor.trim()
    ? req.body.avatarColor.trim()
    : 'blue';
  const avatarIcon = typeof req.body.avatarIcon === 'string' && req.body.avatarIcon.trim()
    ? req.body.avatarIcon.trim()
    : 'book';

  const newRoom: Room = {
    id: roomId,
    name: cleanName,
    password: cleanPass,
    ownerName: cleanStudent,
    isLocked: false,
    createdAt: Date.now(),
    avatarColor,
    avatarIcon,
  };

  rooms.set(roomId, newRoom);
  roomMessages.set(roomId, [
    {
      id: 'msg_' + Date.now(),
      authorName: 'System',
      content: `Room "${cleanName}" was created by ${cleanStudent}. Welcome!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  roomNotes.set(roomId, [
    {
      id: 'note_' + Date.now(),
      title: 'Study Notes for ' + cleanName,
      content: `# ${cleanName}\n\nStart typing collaborative study notes here...`,
      lastEditedBy: cleanStudent,
      updatedAt: 'Just now',
    },
  ]);
  roomFiles.set(roomId, []);
  roomTimetables.set(roomId, []);
  roomWhiteboards.set(roomId, []);
  roomTasks.set(roomId, []);
  roomPolls.set(roomId, []);

  // Initialize persistent member entry for the owner
  const membersMap = new Map<string, RoomMember>();
  membersMap.set(sessionId || 'owner_' + roomId, {
    sessionId: sessionId || 'owner_' + roomId,
    studentName: cleanStudent,
    isOwner: true,
    isHost: true,
    status: {
      presence: 'online',
      activity: '👑 Room Host',
      updatedAt: Date.now(),
    },
  });
  roomMembers.set(roomId, membersMap);

  saveDatabaseToDisk();
  io.emit('room_counts_updated', getActiveRoomCounts());

  return res.json({ success: true, room: newRoom });
});

// Join Room
app.post('/api/rooms/join', (req, res) => {
  const { password, studentName, sessionId, roomId } = req.body;
  const cleanPass = typeof password === 'string' ? password.trim() : '';
  const cleanStudent = typeof studentName === 'string' ? studentName.trim() : '';

  if (!cleanPass || !cleanStudent) {
    return res.status(400).json({
      success: false,
      error: 'Room password and student name are required',
    });
  }

  let targetRoom: Room | null = null;
  // If specific roomId is requested, verify its password
  if (roomId && rooms.has(roomId)) {
    const candidate = rooms.get(roomId)!;
    if (candidate.password.toLowerCase() === cleanPass.toLowerCase() || candidate.password === cleanPass) {
      targetRoom = candidate;
    }
  }

  // Otherwise locate room by permanent password
  if (!targetRoom) {
    for (const r of rooms.values()) {
      if (r.password.toLowerCase() === cleanPass.toLowerCase() || r.password === cleanPass) {
        targetRoom = r;
        break;
      }
    }
  }

  if (!targetRoom) {
    return res.status(404).json({
      success: false,
      error: 'Invalid room password. Please verify the code with your study group.',
    });
  }

  const members = roomMembers.get(targetRoom.id) || new Map();

  // Check if room is locked
  if (targetRoom.isLocked && !members.has(sessionId)) {
    return res.status(403).json({
      success: false,
      error: 'This room is currently locked by the host.',
    });
  }

  // Duplicate-name validation: check if another active connected session has this exact student name
  for (const [mSessionId, m] of members.entries()) {
    if (
      mSessionId !== sessionId &&
      m.studentName.toLowerCase() === cleanStudent.toLowerCase() &&
      m.socketId &&
      socketSessionMap.has(m.socketId)
    ) {
      return res.status(409).json({
        success: false,
        error: `The name "${cleanStudent}" is already in use by an active member in this room. Please choose a unique name or nickname.`,
      });
    }
  }

  return res.json({ success: true, room: targetRoom });
});

// Rejoin Room (Passwords never expire and remain valid permanently)
app.post('/api/rooms/rejoin', (req, res) => {
  const { roomId, password, studentName, sessionId } = req.body;
  const target = rooms.get(roomId);
  if (!target) {
    return res.status(404).json({ success: false, error: 'Room no longer exists' });
  }

  // Passwords never expire. If a password was provided, verify it matches target password
  if (password && target.password.toLowerCase() !== String(password).trim().toLowerCase() && target.password !== String(password).trim()) {
    return res.status(403).json({ success: false, error: 'Incorrect room password' });
  }

  const cleanStudent = typeof studentName === 'string' ? studentName.trim() : '';
  if (cleanStudent) {
    const members = roomMembers.get(target.id) || new Map();
    for (const [mSessionId, m] of members.entries()) {
      if (
        mSessionId !== sessionId &&
        m.studentName.toLowerCase() === cleanStudent.toLowerCase() &&
        m.socketId &&
        socketSessionMap.has(m.socketId)
      ) {
        return res.status(409).json({
          success: false,
          error: `The name "${cleanStudent}" is already in use by an active member in this room.`,
        });
      }
    }
  }

  return res.json({ success: true, room: target });
});

// Get Active Room Counts (Real-time online student counts)
function getActiveRoomCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [rId, membersMap] of roomMembers.entries()) {
    let onlineCount = 0;
    for (const m of membersMap.values()) {
      if (m.socketId && socketSessionMap.has(m.socketId) && m.status?.presence !== 'offline') {
        onlineCount++;
      }
    }
    counts[rId] = onlineCount;
  }
  for (const rId of rooms.keys()) {
    if (counts[rId] === undefined) {
      counts[rId] = 0;
    }
  }
  return counts;
}

app.get('/api/rooms/active-counts', (req, res) => {
  return res.json({ counts: getActiveRoomCounts() });
});

// ---------------------------------------------------------------------------
// BACKUP & DISASTER RECOVERY ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/api/admin/backups', async (_req, res) => {
  try {
    const backups = await listBackups();
    return res.json({ success: true, backups });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/backups/create', async (req, res) => {
  try {
    const backupName = req.body?.name;
    const backup = await createSnapshotBackup(backupName);
    return res.json({ success: true, backup });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/backups/:id/restore', async (req, res) => {
  try {
    const id = req.params.id;
    const success = await restoreFromBackup(isNaN(Number(id)) ? id : Number(id));
    if (success) {
      loadDatabaseFromDisk();
      return res.json({ success: true, message: 'Stuflix data successfully restored from backup.' });
    }
    return res.status(404).json({ success: false, error: 'Backup not found or failed to restore.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// REAL-TIME CHAT & MESSAGING REST ENDPOINTS (Dual-Delivery & Instant Recovery)
// ---------------------------------------------------------------------------
app.get('/api/rooms/:id/messages', (req, res) => {
  const roomId = req.params.id;
  const msgs = roomMessages.get(roomId) || [];
  return res.json({ success: true, messages: msgs });
});

app.post('/api/rooms/:id/messages', async (req, res) => {
  try {
    const roomId = req.params.id;
    const { content, authorName, replyTo, attachment, id } = req.body;

    if (!roomId || (!content && !attachment)) {
      return res.status(400).json({ success: false, error: 'Content or attachment is required.' });
    }

    const msgs = roomMessages.get(roomId) || [];
    const msgId = (id && typeof id === 'string' && id.startsWith('msg_'))
      ? id
      : 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newMsg: ChatMessage = {
      id: msgId,
      authorName: authorName || 'Student',
      content: content || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo,
      attachment,
      reactions: {},
      isPinned: false,
      edited: false,
    };

    const existingIndex = msgs.findIndex((m) => m.id === newMsg.id);
    if (existingIndex >= 0) {
      msgs[existingIndex] = newMsg;
    } else {
      msgs.push(newMsg);
    }
    roomMessages.set(roomId, msgs);
    saveDatabaseToDisk();

    persistMessageToDb(roomId, newMsg).catch((err) =>
      console.error('[Stuflix Storage] REST persistMessageToDb error:', err)
    );

    // Broadcast immediately to WebSocket clients in room
    io.to(`room-${roomId}`).emit('message_received', newMsg);
    io.to(`room-${roomId}`).emit('new_message', newMsg);

    return res.json({ success: true, message: newMsg });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get Complete Permanent Room Data Snapshot
app.get('/api/rooms/:id/data', (req, res) => {
  const roomId = req.params.id;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }

  const membersMap = roomMembers.get(roomId) || new Map();
  const members = Array.from(membersMap.values());
  const activeCount = members.filter((m) => Boolean(m.socketId && socketSessionMap.has(m.socketId) && m.status?.presence !== 'offline')).length;

  return res.json({
    success: true,
    room: { ...room, activeCount },
    messages: roomMessages.get(roomId) || [],
    notes: roomNotes.get(roomId) || [],
    files: roomFiles.get(roomId) || [],
    timetables: roomTimetables.get(roomId) || [],
    whiteboardStrokes: roomWhiteboards.get(roomId) || [],
    tasks: roomTasks.get(roomId) || [],
    members,
    polls: roomPolls.get(roomId) || [],
  });
});

// Get Room By ID
app.get('/api/rooms/:id', (req, res) => {
  const r = rooms.get(req.params.id);
  if (!r) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const membersMap = roomMembers.get(req.params.id);
  let activeCount = 0;
  if (membersMap) {
    for (const m of membersMap.values()) {
      if (m.socketId && socketSessionMap.has(m.socketId) && m.status?.presence !== 'offline') {
        activeCount++;
      }
    }
  }
  return res.json({ room: { ...r, activeCount } });
});

// LiveKit Token & Status
const DEFAULT_STUFLIX_LIVEKIT_URL = 'wss://study-hub-ccbkt901.livekit.cloud';
const DEFAULT_STUFLIX_LIVEKIT_API_KEY = 'API8YfHV8gxN2KR';
const DEFAULT_STUFLIX_LIVEKIT_API_SECRET = 'Q7F5DzdaozNEkDDF3WCi68NWsOLZfTE3ev1S4nQH5od';

function getValidLiveKitUrl(): { url: string; isValid: boolean; errorReason?: string } {
  const envVal = (process.env.STUFLIX_LIVEKIT_URL || process.env.LIVEKIT_URL || '').trim();
  const raw = (envVal && envVal !== 'Nasa' && (envVal.startsWith('wss://') || envVal.startsWith('ws://')))
    ? envVal
    : DEFAULT_STUFLIX_LIVEKIT_URL;

  try {
    const parsed = new URL(raw);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        url: raw,
        isValid: false,
        errorReason: `LIVEKIT_URL hostname '${parsed.hostname}' appears invalid. Expected standard cloud hostname (e.g. wss://stuflix.livekit.cloud).`,
      };
    }
    return { url: raw, isValid: true };
  } catch (e: any) {
    return { url: raw, isValid: false, errorReason: `Failed to parse LIVEKIT_URL: ${e.message}` };
  }
}

function resolveLiveKitApiKey(): string {
  const envKey = (process.env.STUFLIX_LIVEKIT_API_KEY || process.env.LIVEKIT_API_KEY || '').trim();
  if (envKey && envKey !== 'Nasa' && envKey !== 'devkey' && envKey.length > 3) {
    return envKey;
  }
  return DEFAULT_STUFLIX_LIVEKIT_API_KEY;
}

function resolveLiveKitApiSecret(): string {
  const envSec = (process.env.STUFLIX_LIVEKIT_API_SECRET || process.env.LIVEKIT_API_SECRET || '').trim();
  if (envSec && envSec !== 'Nasa' && envSec !== 'secret' && envSec.length > 3) {
    return envSec;
  }
  return DEFAULT_STUFLIX_LIVEKIT_API_SECRET;
}

function getLiveKitCredentialsStatus() {
  const urlCheck = getValidLiveKitUrl();
  const apiKey = resolveLiveKitApiKey();
  const apiSecret = resolveLiveKitApiSecret();

  const apiKeyConfigured = Boolean(apiKey && apiKey !== 'Nasa' && apiKey.length > 3);
  const apiSecretConfigured = Boolean(apiSecret && apiSecret !== 'Nasa' && apiSecret.length > 3);

  const missing: string[] = [];
  if (!urlCheck.isValid) {
    missing.push(urlCheck.errorReason || 'LIVEKIT_URL (must start with wss://)');
  }
  if (!apiKeyConfigured) {
    missing.push('LIVEKIT_API_KEY');
  }
  if (!apiSecretConfigured) {
    missing.push('LIVEKIT_API_SECRET');
  }

  const isConfigured = urlCheck.isValid && apiKeyConfigured && apiSecretConfigured;

  return {
    urlCheck,
    apiKey,
    apiSecret,
    apiKeyConfigured,
    apiSecretConfigured,
    missing,
    isConfigured,
  };
}

app.get('/api/livekit/status', (req, res) => {
  const creds = getLiveKitCredentialsStatus();
  const rawTurnUrl = (process.env.LIVEKIT_TURN_URL || process.env.TURN_URL || '').trim();
  const isTurnValid = Boolean(rawTurnUrl && rawTurnUrl !== 'Nasa' && rawTurnUrl.startsWith('turn'));
  const turnUrl = isTurnValid ? rawTurnUrl : null;
  const rawTurnUser = (process.env.LIVEKIT_TURN_USERNAME || process.env.TURN_USERNAME || '').trim();
  const turnUser = rawTurnUser !== 'Nasa' ? rawTurnUser : '';

  const diagnostics: { status: 'ok' | 'warning' | 'error'; message: string; details?: string }[] = [
    {
      status: 'ok',
      message: 'Google Public STUN cluster active (stun:stun.l.google.com:19302)',
      details: 'Discovers reflexive IP candidates for NAT traversal across different Wi-Fi, hotspot, and mobile networks.',
    },
    {
      status: creds.isConfigured ? 'ok' : 'warning',
      message: creds.isConfigured
        ? 'LiveKit Cloud production gateway verified'
        : creds.missing.length > 0
        ? `Configuration pending: ${creds.missing.join(', ')}`
        : 'LiveKit credentials require verification',
      details: creds.isConfigured
        ? `Connected to ${creds.urlCheck.url}`
        : 'Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in AI Studio Secrets.',
    },
  ];

  if (turnUrl) {
    diagnostics.push({
      status: 'ok',
      message: `Custom TURN relay configured (${turnUrl})`,
      details: 'Relayed media transport enabled for restrictive symmetric firewalls.',
    });
  }

  const response: LiveKitStatusResponse = {
    configured: creds.isConfigured,
    livekitUrl: creds.urlCheck.url,
    apiKeyConfigured: creds.apiKeyConfigured,
    apiSecretConfigured: creds.apiSecretConfigured,
    urlConfigured: creds.urlCheck.isValid,
    url: creds.urlCheck.url,
    apiKeyMasked: creds.apiKeyConfigured ? '***' + creds.apiKey.slice(-4) : null,
    apiSecretMasked: creds.apiSecretConfigured ? '***' + creds.apiSecret.slice(-4) : null,
    isDemoUrl: !creds.urlCheck.isValid,
    isDevKey: !creds.apiKeyConfigured,
    missingVariables: creds.missing,
    turnStatus: {
      customTurnConfigured: Boolean(turnUrl),
      turnUrl: turnUrl,
      turnUsernameConfigured: Boolean(turnUser),
      googleStunConfigured: true,
    },
    diagnostics,
    crossNetworkReady: true,
  };
  return res.json(response);
});

// GET endpoint for /api/livekit/token to allow direct browser checks & diagnostics
app.get('/api/livekit/token', (req, res) => {
  const creds = getLiveKitCredentialsStatus();
  return res.status(200).json({
    status: 'online',
    endpoint: '/api/livekit/token',
    method: 'GET',
    supportedMethod: 'POST',
    description: 'Generates JWT access tokens for LiveKit study room video/audio calls.',
    configured: creds.isConfigured,
    livekitUrl: creds.urlCheck.url,
    apiKeyConfigured: creds.apiKeyConfigured,
    apiSecretConfigured: creds.apiSecretConfigured,
    missingVariables: creds.missing,
    instructions: 'Send a POST request with JSON body { roomId: string, studentName: string, sessionId?: string } to generate a token.',
  });
});

app.post('/api/livekit/token', async (req, res) => {
  try {
    const roomId = (req.body.roomId || req.body.roomName || req.body.roomCode || '').trim();
    const studentName = (req.body.studentName || req.body.participantName || '').trim();
    const sessionId = (req.body.sessionId || req.body.participantIdentity || req.body.studentId || `stu_${Math.random().toString(36).substring(2, 9)}`).trim();

    if (!roomId || !studentName) {
      return res.status(400).json({
        error: 'roomId and studentName are required',
        details: 'Both room code and student name must be provided as non-empty strings.',
        received: {
          roomId: Boolean(roomId),
          studentName: Boolean(studentName),
        },
      });
    }

    const creds = getLiveKitCredentialsStatus();
    if (!creds.isConfigured) {
      return res.status(503).json({
        error: 'LiveKit credentials not configured',
        details: 'LiveKit credentials (LIVEKIT_API_KEY, LIVEKIT_API_SECRET) are pending configuration in AI Studio Secrets.',
        configured: false,
        livekitUrl: creds.urlCheck.url,
        apiKeyConfigured: creds.apiKeyConfigured,
        apiSecretConfigured: creds.apiSecretConfigured,
        missingVariables: creds.missing,
        hint: 'Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in AI Studio Secrets.',
      });
    }

    const effectiveUrl = creds.urlCheck.url;
    const effectiveKey = creds.apiKey;
    const effectiveSecret = creds.apiSecret;

    const at = new AccessToken(effectiveKey, effectiveSecret, {
      identity: sessionId,
      name: studentName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ];

    const rawTurnUrl = (process.env.LIVEKIT_TURN_URL || process.env.TURN_URL || '').trim();
    const isTurnValid = Boolean(rawTurnUrl && rawTurnUrl !== 'Nasa' && (rawTurnUrl.startsWith('turn:') || rawTurnUrl.startsWith('turns:')));

    if (isTurnValid) {
      const turnUser = (process.env.LIVEKIT_TURN_USERNAME || process.env.TURN_USERNAME || '').trim();
      const turnPass = (process.env.LIVEKIT_TURN_CREDENTIAL || process.env.LIVEKIT_TURN_PASSWORD || process.env.TURN_PASSWORD || '').trim();
      iceServers.push({
        urls: rawTurnUrl,
        username: turnUser !== 'Nasa' ? turnUser : '',
        credential: turnPass !== 'Nasa' ? turnPass : '',
      });
    }

    return res.json({
      token,
      serverUrl: effectiveUrl,
      url: effectiveUrl,
      configured: true,
      isUrlValid: true,
      missingVariables: [],
      participantIdentity: sessionId,
      participantName: studentName,
      roomName: roomId,
      iceServers,
    });
  } catch (err: any) {
    console.error('Failed to generate call token:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate token' });
  }
});

// ---------------------------------------------------------------------------
// EXAM DIFFICULTY RATING SYSTEM ENDPOINTS
// ---------------------------------------------------------------------------

// List all exam papers
app.get('/api/exams', (req, res) => {
  const exams = Array.from(examPapers.values()).sort((a, b) => {
    // Sort by total votes or recency
    return b.totalVotes - a.totalVotes || b.createdAt - a.createdAt;
  });
  return res.json({ success: true, exams });
});

// Rate an exam paper
app.post('/api/exams/rate', (req, res) => {
  const { examId, studentName, rating, comment } = req.body;
  if (!examId || !studentName || typeof rating !== 'number') {
    return res.status(400).json({ success: false, error: 'examId, studentName, and numeric rating (1-5) are required' });
  }

  const numRating = Math.min(5, Math.max(1, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
  const exam = examPapers.get(examId);
  if (!exam) {
    return res.status(404).json({ success: false, error: 'Exam paper not found' });
  }

  const existingIndex = exam.ratings.findIndex((r) => r.studentName.toLowerCase() === studentName.toLowerCase().trim());
  const review: ExamRatingReview = {
    id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    studentName: studentName.trim(),
    rating: numRating,
    comment: comment && typeof comment === 'string' ? comment.trim() : undefined,
    createdAt: Date.now(),
  };

  if (existingIndex >= 0) {
    exam.ratings[existingIndex] = review;
  } else {
    exam.ratings.push(review);
  }

  const totalScore = exam.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  exam.totalVotes = exam.ratings.length;
  exam.averageRating = Number((totalScore / exam.totalVotes).toFixed(1));

  scheduleDatabaseSave();
  io.emit('exam_paper_updated', exam);

  return res.json({ success: true, exam });
});

// Create new exam paper review
app.post('/api/exams/create', (req, res) => {
  const { title, subject, code, examDate, creatorName, initialRating, comment } = req.body;
  if (!title || !subject) {
    return res.status(400).json({ success: false, error: 'Title and subject are required' });
  }

  const examId = 'exam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newExam: ExamPaper = {
    id: examId,
    title: title.trim(),
    subject: subject.trim(),
    code: code && typeof code === 'string' ? code.trim() : undefined,
    examDate: examDate || new Date().toISOString().split('T')[0],
    ratings: [],
    averageRating: 0,
    totalVotes: 0,
    createdAt: Date.now(),
  };

  if (creatorName && typeof initialRating === 'number' && initialRating >= 1 && initialRating <= 5) {
    const review: ExamRatingReview = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      studentName: creatorName.trim(),
      rating: Math.round(initialRating) as 1 | 2 | 3 | 4 | 5,
      comment: comment && typeof comment === 'string' ? comment.trim() : undefined,
      createdAt: Date.now(),
    };
    newExam.ratings.push(review);
    newExam.totalVotes = 1;
    newExam.averageRating = review.rating;
  }

  examPapers.set(examId, newExam);
  scheduleDatabaseSave();
  io.emit('exam_paper_created', newExam);

  return res.json({ success: true, exam: newExam });
});

// ---------------------------------------------------------------------------
// STUDY ANALYTICS DASHBOARD ENDPOINTS
// ---------------------------------------------------------------------------

// Get student study analytics
app.get('/api/analytics/:studentName', (req, res) => {
  const { studentName } = req.params;
  if (!studentName) {
    return res.status(400).json({ success: false, error: 'studentName is required' });
  }
  const analytics = getOrCreateStudentAnalytics(decodeURIComponent(studentName));
  return res.json({ success: true, analytics });
});

// Log a study session (from Pomodoro timer or manual study interval)
app.post('/api/analytics/log-session', (req, res) => {
  const { studentName, durationMinutes, subject, focusScore, notes, soundUsed } = req.body;
  if (!studentName || typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    return res.status(400).json({ success: false, error: 'studentName and positive durationMinutes are required' });
  }

  const cleanSubject = (subject && typeof subject === 'string' ? subject.trim() : 'General Study');
  const analytics = getOrCreateStudentAnalytics(studentName.trim());

  const sessionLog: StudySessionLog = {
    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    subject: cleanSubject,
    durationMinutes: Math.round(durationMinutes),
    timestamp: Date.now(),
    focusScore: typeof focusScore === 'number' ? Math.min(100, Math.max(0, focusScore)) : 90,
    notes: notes && typeof notes === 'string' ? notes.trim() : undefined,
    soundUsed: soundUsed && typeof soundUsed === 'string' ? soundUsed.trim() : undefined,
  };

  analytics.recentSessions.unshift(sessionLog);
  if (analytics.recentSessions.length > 20) {
    analytics.recentSessions.pop();
  }

  // Update cumulative totals
  analytics.totalStudyMinutes += sessionLog.durationMinutes;
  analytics.dailyStudyMinutes += sessionLog.durationMinutes;
  analytics.weeklyStudyMinutes += sessionLog.durationMinutes;
  analytics.monthlyStudyMinutes += sessionLog.durationMinutes;
  analytics.focusSessionsCompleted += 1;

  // Update subject breakdown
  if (!analytics.subjectBreakdown[cleanSubject]) {
    analytics.subjectBreakdown[cleanSubject] = 0;
  }
  analytics.subjectBreakdown[cleanSubject] += sessionLog.durationMinutes;

  // Update real sound analytics if sound was used
  if (sessionLog.soundUsed) {
    if (!analytics.soundAnalytics) {
      analytics.soundAnalytics = {
        totalSessionsWithAudio: 0,
        soundPlayCounts: {},
      };
    }
    analytics.soundAnalytics.totalSessionsWithAudio += 1;
    const soundKey = sessionLog.soundUsed;
    analytics.soundAnalytics.soundPlayCounts[soundKey] =
      (analytics.soundAnalytics.soundPlayCounts[soundKey] || 0) + 1;

    // Find most used sound
    let maxCount = 0;
    let topSound = '';
    for (const [sId, count] of Object.entries(analytics.soundAnalytics.soundPlayCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topSound = sId;
      }
    }
    analytics.soundAnalytics.mostUsedSound = topSound;

    // Determine preferred environment
    const ambientSounds = ['coffee_shop', 'library', 'classroom', 'study_room'];
    const hasAmbient = ambientSounds.some((a) => (analytics.soundAnalytics?.soundPlayCounts[a] || 0) > 0);
    if (topSound === 'library') {
      analytics.soundAnalytics.preferredEnvironment = '☕ Library Ambience';
    } else if (topSound === 'coffee_shop') {
      analytics.soundAnalytics.preferredEnvironment = '☕ Coffee Shop';
    } else if (topSound.includes('rain')) {
      analytics.soundAnalytics.preferredEnvironment = '🌧 Rain Ambience';
    } else if (hasAmbient) {
      analytics.soundAnalytics.preferredEnvironment = '☕ Quiet Study Space';
    } else {
      analytics.soundAnalytics.preferredEnvironment = '🧠 Deep Focus Audio';
    }
  }

  // Update today's entry in dailyHistory
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = analytics.dailyHistory.find((h) => h.date === todayStr);
  if (todayEntry) {
    todayEntry.minutes += sessionLog.durationMinutes;
  } else {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    analytics.dailyHistory.push({
      date: todayStr,
      dayLabel: days[new Date().getDay()],
      minutes: sessionLog.durationMinutes,
    });
    if (analytics.dailyHistory.length > 7) {
      analytics.dailyHistory.shift();
    }
  }

  scheduleDatabaseSave();
  return res.json({ success: true, analytics });
});

// ---------------------------------------------------------------------------
// ROOM POLLS ENDPOINTS
// ---------------------------------------------------------------------------

app.get('/api/rooms/:roomId/polls', (req, res) => {
  const { roomId } = req.params;
  const polls = roomPolls.get(roomId) || [];
  return res.json({ success: true, polls });
});

// Health check
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: Date.now() });
});

// JSON fallback for unknown API routes (prevents HTML fallback)
app.all('/api/*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.path} not found`,
    status: 404,
  });
});

// ---------------------------------------------------------------------------
// SOCKET.IO REALTIME SERVER
// ---------------------------------------------------------------------------

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e7, // 50MB
});

const avatarColors = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-purple-600',
  'bg-teal-600',
  'bg-cyan-600',
];

const pendingDisconnects = new Map<string, NodeJS.Timeout>();

// Periodic Heartbeat Presence Sweep (runs every 15s to clean up ghost connections)
setInterval(() => {
  let dirtyRooms = new Set<string>();
  for (const [roomId, membersMap] of roomMembers.entries()) {
    for (const [memKey, mem] of membersMap.entries()) {
      if (mem.status?.presence === 'online') {
        const isSocketConnected = mem.socketId ? Boolean(io.sockets.sockets.get(mem.socketId)) : false;
        const disconnectKey = `${roomId}_${memKey}`;
        if (!isSocketConnected && !pendingDisconnects.has(disconnectKey)) {
          mem.socketId = undefined;
          mem.inCall = false;
          mem.isSpeaking = false;
          mem.isTyping = false;
          mem.status = {
            activity: mem.status?.activity || 'Offline',
            customText: mem.status?.customText,
            presence: 'offline',
            updatedAt: Date.now(),
          };
          dirtyRooms.add(roomId);
        }
      }
    }
  }
  for (const roomId of dirtyRooms) {
    const membersMap = roomMembers.get(roomId);
    if (membersMap) {
      const membersList = Array.from(membersMap.values());
      io.to(`room-${roomId}`).emit('members_updated', membersList);
      io.to(`room-${roomId}`).emit('room_members_updated', membersList);
    }
  }
}, 15000);

io.on('connection', (socket) => {
  // Emit initial active student counts across all rooms to newly connected client
  socket.emit('room_counts_updated', getActiveRoomCounts());

  // Heartbeat ping handler
  socket.on('heartbeat', ({ roomId, sessionId }: { roomId: string; sessionId: string }) => {
    if (!roomId) return;
    const membersMap = roomMembers.get(roomId);
    if (membersMap) {
      const memberKey = sessionId || socket.id;
      const mem = membersMap.get(memberKey);
      if (mem) {
        if (!mem.status) {
          mem.status = {
            presence: 'online',
            activity: '📚 Studying',
            updatedAt: Date.now(),
          };
        } else {
          mem.status.updatedAt = Date.now();
        }
        mem.socketId = socket.id;
        if (mem.status.presence !== 'online') {
          mem.status.presence = 'online';
          const membersList = Array.from(membersMap.values());
          io.to(`room-${roomId}`).emit('members_updated', membersList);
          io.to(`room-${roomId}`).emit('room_members_updated', membersList);
        }
      }
    }
  });

  // 1. Enter room
  socket.on('enter_room', ({ roomId, studentName, sessionId }) => {
    if (!roomId || !studentName) return;

    socket.join(`room-${roomId}`);
    socketSessionMap.set(socket.id, { roomId, sessionId });

    let membersMap = roomMembers.get(roomId);
    if (!membersMap) {
      membersMap = new Map();
      roomMembers.set(roomId, membersMap);
    }

    const room = rooms.get(roomId);
    const isOwner = room ? room.ownerName.toLowerCase() === studentName.toLowerCase() : false;

    // Pick avatar color based on name hash
    let hash = 0;
    for (let i = 0; i < studentName.length; i++) {
      hash = (hash << 5) - hash + studentName.charCodeAt(i);
    }
    const color = avatarColors[Math.abs(hash) % avatarColors.length];

    const memberKey = sessionId || socket.id;
    const disconnectKey = `${roomId}_${memberKey}`;
    if (pendingDisconnects.has(disconnectKey)) {
      clearTimeout(pendingDisconnects.get(disconnectKey));
      pendingDisconnects.delete(disconnectKey);
    }

    const existingMember = membersMap.get(memberKey);
    const member: RoomMember = {
      sessionId: memberKey,
      socketId: socket.id,
      studentName,
      color: existingMember?.color || color,
      isOwner: existingMember?.isOwner !== undefined ? existingMember.isOwner : isOwner,
      isHost: existingMember?.isHost !== undefined ? existingMember.isHost : isOwner,
      inCall: existingMember?.inCall || false,
      isCameraOn: existingMember?.isCameraOn || false,
      isMicOn: existingMember?.isMicOn || false,
      isScreenSharing: existingMember?.isScreenSharing || false,
      isSpeaking: false,
      networkQuality: 'good',
      isTyping: false,
      status: {
        presence: 'online',
        activity: existingMember?.status?.activity || (isOwner ? '👑 Room Host' : '📚 Studying'),
        customText: existingMember?.status?.customText,
        updatedAt: Date.now(),
      },
    };

    membersMap.set(memberKey, member);
    saveDatabaseToDisk();

    const membersList = Array.from(membersMap.values());

    // Send complete room data snapshot to this user
    socket.emit('room_data', {
      room,
      messages: roomMessages.get(roomId) || [],
      notes: roomNotes.get(roomId) || [],
      files: roomFiles.get(roomId) || [],
      timetables: roomTimetables.get(roomId) || [],
      whiteboardStrokes: roomWhiteboards.get(roomId) || [],
      tasks: roomTasks.get(roomId) || [],
      members: membersList,
      polls: roomPolls.get(roomId) || [],
    });

    // Notify others in room
    io.to(`room-${roomId}`).emit('members_updated', membersList);
    io.to(`room-${roomId}`).emit('room_members_updated', membersList);

    // Broadcast updated global room counts to all active sessions
    io.emit('room_counts_updated', getActiveRoomCounts());
  });

  // 2. Leave room - keep member permanently stored, mark offline
  socket.on('leave_room', ({ roomId, sessionId }) => {
    const membersMap = roomMembers.get(roomId);
    if (membersMap) {
      const memberKey = sessionId || socket.id;
      const mem = membersMap.get(memberKey);
      if (mem) {
        mem.socketId = undefined;
        mem.inCall = false;
        mem.isSpeaking = false;
        mem.isTyping = false;
        mem.status = {
          activity: mem.status?.activity || 'Offline',
          customText: mem.status?.customText,
          presence: 'offline',
          updatedAt: Date.now(),
        };
      }
      saveDatabaseToDisk();
      const membersList = Array.from(membersMap.values());
      io.to(`room-${roomId}`).emit('members_updated', membersList);
      io.to(`room-${roomId}`).emit('room_members_updated', membersList);
    }
    socket.leave(`room-${roomId}`);
    socketSessionMap.delete(socket.id);

    // Broadcast updated room counts
    io.emit('room_counts_updated', getActiveRoomCounts());
  });

  // 3. Send message
  socket.on('send_message', async ({ roomId, authorName, content, replyTo, attachment, id }) => {
    if (!roomId || (!content && !attachment)) return;

    // Ensure sender socket is registered in the room channel
    socket.join(`room-${roomId}`);

    const msgs = roomMessages.get(roomId) || [];
    const msgId = (id && typeof id === 'string' && id.startsWith('msg_'))
      ? id
      : 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newMsg: ChatMessage = {
      id: msgId,
      authorName: authorName || 'Student',
      content: content || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo,
      attachment,
      reactions: {},
      isPinned: false,
      edited: false,
    };

    const existingIndex = msgs.findIndex((m) => m.id === newMsg.id);
    if (existingIndex >= 0) {
      msgs[existingIndex] = newMsg;
    } else {
      msgs.push(newMsg);
    }
    roomMessages.set(roomId, msgs);
    saveDatabaseToDisk();

    // Persist to PostgreSQL
    persistMessageToDb(roomId, newMsg).catch((err) =>
      console.error('[Stuflix Storage] Socket persistMessageToDb error:', err)
    );

    // Broadcast to room
    io.to(`room-${roomId}`).emit('message_received', newMsg);
    io.to(`room-${roomId}`).emit('new_message', newMsg);

    // Direct echo acknowledgment to sender
    socket.emit('message_received', newMsg);
  });

  // 4. Edit message
  socket.on('edit_message', ({ roomId, messageId, content }) => {
    const msgs = roomMessages.get(roomId) || [];
    const target = msgs.find((m) => m.id === messageId);
    if (target) {
      target.content = content;
      target.edited = true;
      saveDatabaseToDisk();
      updateMessageInDb(roomId, target).catch((err) =>
        console.error('[Stuflix Storage] updateMessageInDb error:', err)
      );
      io.to(`room-${roomId}`).emit('message_edited', target);
      io.to(`room-${roomId}`).emit('message_updated', target);
    }
  });

  // 5. Delete message
  socket.on('delete_message', ({ roomId, messageId }) => {
    const msgs = roomMessages.get(roomId) || [];
    const filtered = msgs.filter((m) => m.id !== messageId);
    roomMessages.set(roomId, filtered);
    saveDatabaseToDisk();
    deleteMessageFromDb(roomId, messageId).catch((err) =>
      console.error('[Stuflix Storage] deleteMessageFromDb error:', err)
    );
    io.to(`room-${roomId}`).emit('message_deleted', { messageId });
  });

  // 6. Toggle reaction
  const handleReaction = ({ roomId, messageId, emoji, studentName }: any) => {
    const msgs = roomMessages.get(roomId) || [];
    const target = msgs.find((m) => m.id === messageId);
    if (target) {
      if (!target.reactions) target.reactions = {};
      const list = target.reactions[emoji] || [];
      if (list.includes(studentName)) {
        target.reactions[emoji] = list.filter((n) => n !== studentName);
        if (target.reactions[emoji].length === 0) {
          delete target.reactions[emoji];
        }
      } else {
        target.reactions[emoji] = [...list, studentName];
      }
      saveDatabaseToDisk();
      updateMessageInDb(roomId, target).catch((err) =>
        console.error('[Stuflix Storage] updateMessageInDb reaction error:', err)
      );
      io.to(`room-${roomId}`).emit('reaction_updated', { messageId, reactions: target.reactions });
      io.to(`room-${roomId}`).emit('message_reactions_updated', { messageId, reactions: target.reactions });
    }
  };
  socket.on('toggle_reaction', handleReaction);
  socket.on('toggle_message_reaction', handleReaction);

  // 7. Pin message
  socket.on('pin_message', ({ roomId, messageId, isPinned }) => {
    const msgs = roomMessages.get(roomId) || [];
    const target = msgs.find((m) => m.id === messageId);
    if (target) {
      target.isPinned = isPinned;
      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('message_pinned_updated', { messageId, isPinned });
    }
  });

  // 8. Typing status
  socket.on('typing_status', ({ roomId, studentName, isTyping }) => {
    io.to(`room-${roomId}`).emit('user_typing', { studentName, isTyping });
  });
  socket.on('typing', ({ roomId, studentName, isTyping }) => {
    io.to(`room-${roomId}`).emit('user_typing', { studentName, isTyping });
  });

  // 9. Notes: create
  socket.on('create_note', ({ roomId, title, studentName }) => {
    const notes = roomNotes.get(roomId) || [];
    const newNote: Note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title || 'Untitled Note',
      content: '',
      lastEditedBy: studentName,
      updatedAt: 'Just now',
    };
    notes.push(newNote);
    roomNotes.set(roomId, notes);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('note_created', newNote);
  });

  // 10. Notes: update
  socket.on('update_note', ({ roomId, noteId, title, content, updates, studentName }) => {
    const notes = roomNotes.get(roomId) || [];
    const target = notes.find((n) => n.id === noteId);
    if (target) {
      const finalTitle = updates?.title !== undefined ? updates.title : title;
      const finalContent = updates?.content !== undefined ? updates.content : content;
      if (finalTitle !== undefined) target.title = finalTitle;
      if (finalContent !== undefined) target.content = finalContent;
      target.lastEditedBy = studentName || target.lastEditedBy;
      target.updatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('note_updated', target);
    }
  });

  // 11. Notes: delete
  socket.on('delete_note', ({ roomId, noteId }) => {
    const notes = roomNotes.get(roomId) || [];
    const filtered = notes.filter((n) => n.id !== noteId);
    roomNotes.set(roomId, filtered);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('note_deleted', { noteId });
  });

  // 12. Files: upload
  socket.on('upload_file', ({ roomId, file, studentName }) => {
    if (!roomId || !file) return;
    const files = roomFiles.get(roomId) || [];
    const newFile: SharedFile = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: file.dataUrl,
      uploadedBy: studentName || file.uploadedBy || 'Student',
      uploadedAt: new Date().toLocaleDateString([], { day: '2-digit', month: 'short' }),
    };
    files.unshift(newFile);
    roomFiles.set(roomId, files);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('file_uploaded', newFile);
  });

  // 13. Files: delete
  socket.on('delete_file', ({ roomId, fileId }) => {
    const files = roomFiles.get(roomId) || [];
    const filtered = files.filter((f) => f.id !== fileId);
    roomFiles.set(roomId, filtered);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('file_deleted', { fileId });
  });

  // 14. Timetable: create (supports both event names)
  const handleTimetableCreate = ({ roomId, entry, studentName }: any) => {
    if (!roomId || !entry) return;
    const tt = roomTimetables.get(roomId) || [];
    const newEntry: TimetableEntry = {
      id: 'tt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      subject: entry.subject,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      createdBy: studentName || entry.createdBy || 'Student',
    };
    tt.push(newEntry);
    roomTimetables.set(roomId, tt);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('timetable_created', newEntry);
    io.to(`room-${roomId}`).emit('timetable_entry_created', newEntry);
  };
  socket.on('create_timetable', handleTimetableCreate);
  socket.on('create_timetable_entry', handleTimetableCreate);

  // 15. Timetable: update
  const handleTimetableUpdate = ({ roomId, entryId, entry, updates }: any) => {
    const tt = roomTimetables.get(roomId) || [];
    const target = tt.find((t) => t.id === entryId);
    if (target) {
      Object.assign(target, updates || entry);
      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('timetable_updated', target);
      io.to(`room-${roomId}`).emit('timetable_entry_updated', target);
    }
  };
  socket.on('update_timetable', handleTimetableUpdate);
  socket.on('update_timetable_entry', handleTimetableUpdate);

  // 16. Timetable: delete
  const handleTimetableDelete = ({ roomId, entryId }: any) => {
    const tt = roomTimetables.get(roomId) || [];
    const filtered = tt.filter((t) => t.id !== entryId);
    roomTimetables.set(roomId, filtered);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('timetable_deleted', { entryId });
    io.to(`room-${roomId}`).emit('timetable_entry_deleted', { entryId });
  };
  socket.on('delete_timetable', handleTimetableDelete);
  socket.on('delete_timetable_entry', handleTimetableDelete);

  // 17. Room host controls: lock
  const handleRoomLock = ({ roomId, isLocked }: any) => {
    const room = rooms.get(roomId);
    if (room) {
      room.isLocked = isLocked;
      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('room_lock_updated', { isLocked });
      io.to(`room-${roomId}`).emit('room_updated', room);
    }
  };
  socket.on('toggle_room_lock', handleRoomLock);
  socket.on('toggle_lock_room', handleRoomLock);

  // 18. Room host controls: password (passwords never expire; owner changes are permanent)
  socket.on('change_room_password', ({ roomId, password, newPassword }) => {
    const effectivePass = (newPassword || password || '').trim();
    if (!effectivePass) return;
    const room = rooms.get(roomId);
    if (room) {
      room.password = effectivePass;
      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('room_password_updated', { password: effectivePass, room });
      io.to(`room-${roomId}`).emit('room_updated', room);
    }
  });

  // 19. Room host controls: kick member
  socket.on('remove_member', ({ roomId, sessionId, targetSessionId }) => {
    const targetId = targetSessionId || sessionId;
    const membersMap = roomMembers.get(roomId);
    if (membersMap) {
      const target = membersMap.get(targetId);
      if (target && target.socketId) {
        io.to(target.socketId).emit('kicked_from_room', {
          message: 'You have been removed from this room by the host.',
        });
      }
      membersMap.delete(targetId);
      saveDatabaseToDisk();
      const membersList = Array.from(membersMap.values());
      io.to(`room-${roomId}`).emit('members_updated', membersList);
      io.to(`room-${roomId}`).emit('room_members_updated', membersList);
      io.to(`room-${roomId}`).emit('member_removed', { sessionId: targetId });
    }
  });

  // 20. Room host controls: transfer ownership
  socket.on('transfer_ownership', ({ roomId, newOwnerName }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.ownerName = newOwnerName;
      const membersMap = roomMembers.get(roomId);
      if (membersMap) {
        for (const m of membersMap.values()) {
          m.isOwner = m.studentName.toLowerCase() === newOwnerName.toLowerCase();
          m.isHost = m.isOwner;
        }
        const membersList = Array.from(membersMap.values());
        io.to(`room-${roomId}`).emit('members_updated', membersList);
        io.to(`room-${roomId}`).emit('room_members_updated', membersList);
      }
      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('ownership_transferred', { newOwnerName });
      io.to(`room-${roomId}`).emit('room_updated', room);
    }
  });

  // 21. Room host controls: delete room
  socket.on('delete_room', ({ roomId }) => {
    rooms.delete(roomId);
    roomMessages.delete(roomId);
    roomNotes.delete(roomId);
    roomFiles.delete(roomId);
    roomTimetables.delete(roomId);
    roomWhiteboards.delete(roomId);
    roomTasks.delete(roomId);
    roomMembers.delete(roomId);
    roomPolls.delete(roomId);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('room_deleted');
    io.emit('room_counts_updated', getActiveRoomCounts());
  });

  // 22. Call state sync
  socket.on(
    'update_media_state',
    ({ roomId, inCall, isCameraOn, isMicOn, isScreenSharing, isSpeaking, networkQuality }) => {
      const sess = socketSessionMap.get(socket.id);
      if (!sess) return;
      const membersMap = roomMembers.get(roomId);
      if (!membersMap) return;
      const member = membersMap.get(sess.sessionId);
      if (member) {
        if (inCall !== undefined) member.inCall = inCall;
        if (isCameraOn !== undefined) member.isCameraOn = isCameraOn;
        if (isMicOn !== undefined) member.isMicOn = isMicOn;
        if (isScreenSharing !== undefined) member.isScreenSharing = isScreenSharing;
        if (isSpeaking !== undefined) member.isSpeaking = isSpeaking;
        if (networkQuality !== undefined) member.networkQuality = networkQuality;

        const membersList = Array.from(membersMap.values());
        io.to(`room-${roomId}`).emit('members_updated', membersList);
        io.to(`room-${roomId}`).emit('call_user_state_updated', {
          sessionId: sess.sessionId,
          studentName: member.studentName,
          inCall: member.inCall,
          isCameraOn: member.isCameraOn,
          isMicOn: member.isMicOn,
          isScreenSharing: member.isScreenSharing,
          isSpeaking: member.isSpeaking,
          networkQuality: member.networkQuality,
        });
      }
    }
  );

  socket.on('toggle_hand_raise', ({ roomId, studentName, isHandRaised }: { roomId: string; studentName: string; isHandRaised: boolean }) => {
    if (!roomId) return;
    io.to(`room-${roomId}`).emit('hand_raise_updated', { studentName, isHandRaised });
  });

  // 23. Whiteboard: add stroke
  socket.on('whiteboard_stroke', ({ roomId, stroke }: { roomId: string; stroke: WhiteboardStroke }) => {
    if (!roomId || !stroke) return;
    const strokes = roomWhiteboards.get(roomId) || [];
    strokes.push(stroke);
    if (strokes.length > 2000) strokes.shift();
    roomWhiteboards.set(roomId, strokes);
    saveDatabaseToDisk();
    socket.to(`room-${roomId}`).emit('whiteboard_stroke_received', stroke);
  });

  // 24. Whiteboard: clear
  socket.on('whiteboard_clear', ({ roomId, studentName }: { roomId: string; studentName: string }) => {
    if (!roomId) return;
    roomWhiteboards.set(roomId, []);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('whiteboard_cleared', { studentName });
  });

  // 25. Whiteboard: undo
  socket.on('whiteboard_undo', ({ roomId, strokeId }: { roomId: string; strokeId?: string }) => {
    if (!roomId) return;
    const strokes = roomWhiteboards.get(roomId) || [];
    if (strokeId) {
      const filtered = strokes.filter((s) => s.id !== strokeId);
      roomWhiteboards.set(roomId, filtered);
    } else {
      strokes.pop();
      roomWhiteboards.set(roomId, strokes);
    }
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('whiteboard_state_updated', roomWhiteboards.get(roomId) || []);
  });

  // 26. Tasks: create task
  socket.on(
    'create_task',
    ({
      roomId,
      task,
      studentName,
    }: {
      roomId: string;
      task: {
        title: string;
        description?: string;
        status?: 'todo' | 'in_progress' | 'completed';
        priority?: 'low' | 'medium' | 'high';
        assignee?: string;
        dueDate?: string;
        tags?: string[];
      };
      studentName: string;
    }) => {
      if (!roomId || !task || !task.title) return;

      const tasks = roomTasks.get(roomId) || [];
      const newTask: KanbanTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: task.title.trim(),
        description: task.description ? task.description.trim() : '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee: task.assignee || '',
        dueDate: task.dueDate || '',
        tags: task.tags || [],
        createdBy: studentName,
        createdAt: Date.now(),
      };

      tasks.push(newTask);
      roomTasks.set(roomId, tasks);
      saveDatabaseToDisk();

      io.to(`room-${roomId}`).emit('task_created', newTask);
    }
  );

  // 27. Tasks: update task
  socket.on(
    'update_task',
    ({
      roomId,
      taskId,
      updates,
    }: {
      roomId: string;
      taskId: string;
      updates: Partial<KanbanTask>;
    }) => {
      if (!roomId || !taskId) return;
      const tasks = roomTasks.get(roomId) || [];
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        tasks[index] = {
          ...tasks[index],
          ...updates,
          updatedAt: Date.now(),
        };
        roomTasks.set(roomId, tasks);
        saveDatabaseToDisk();
        io.to(`room-${roomId}`).emit('task_updated', tasks[index]);
      }
    }
  );

  // 28. Tasks: move task
  socket.on(
    'move_task',
    ({
      roomId,
      taskId,
      newStatus,
    }: {
      roomId: string;
      taskId: string;
      newStatus: 'todo' | 'in_progress' | 'completed';
    }) => {
      if (!roomId || !taskId || !newStatus) return;
      const tasks = roomTasks.get(roomId) || [];
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        tasks[index].status = newStatus;
        tasks[index].updatedAt = Date.now();
        roomTasks.set(roomId, tasks);
        saveDatabaseToDisk();
        io.to(`room-${roomId}`).emit('task_updated', tasks[index]);
      }
    }
  );

  // 29. Tasks: delete task
  socket.on('delete_task', ({ roomId, taskId }: { roomId: string; taskId: string }) => {
    if (!roomId || !taskId) return;
    const tasks = roomTasks.get(roomId) || [];
    const filtered = tasks.filter((t) => t.id !== taskId);
    roomTasks.set(roomId, filtered);
    saveDatabaseToDisk();
    io.to(`room-${roomId}`).emit('task_deleted', { taskId });
  });

  // 30. Dual-Layer User Status Update
  socket.on(
    'update_status',
    ({
      roomId,
      sessionId,
      status,
    }: {
      roomId: string;
      sessionId: string;
      status: UserStatus;
    }) => {
      if (!roomId || !status) return;
      const membersMap = roomMembers.get(roomId);
      if (!membersMap) return;
      const member = membersMap.get(sessionId || socket.id);
      if (member) {
        member.status = {
          ...status,
          updatedAt: Date.now(),
        };
        saveDatabaseToDisk();
        const membersList = Array.from(membersMap.values());
        io.to(`room-${roomId}`).emit('members_updated', membersList);
        io.to(`room-${roomId}`).emit('room_members_updated', membersList);
      }
    }
  );

  // 31. Polls: Create Poll
  socket.on(
    'create_poll',
    ({
      roomId,
      question,
      options,
      allowMultiple,
      isAnonymous,
      authorName,
    }: {
      roomId: string;
      question: string;
      options: string[];
      allowMultiple?: boolean;
      isAnonymous?: boolean;
      authorName: string;
    }) => {
      if (!roomId || !question || !Array.isArray(options) || options.length < 2) return;

      const polls = roomPolls.get(roomId) || [];
      const pollId = 'poll_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newPoll: Poll = {
        id: pollId,
        roomId,
        authorName: authorName || 'Student',
        question: question.trim(),
        options: options.map((opt, idx) => ({
          id: `opt_${idx}_` + Math.random().toString(36).substring(2, 6),
          text: opt.trim(),
          votes: [],
        })),
        allowMultiple: Boolean(allowMultiple),
        isAnonymous: Boolean(isAnonymous),
        createdAt: Date.now(),
      };

      polls.unshift(newPoll);
      roomPolls.set(roomId, polls);

      // Also create an inline chat message for the poll
      const msgs = roomMessages.get(roomId) || [];
      const pollMsg: ChatMessage = {
        id: 'msg_poll_' + newPoll.id,
        authorName: authorName || 'Student',
        content: `📊 Poll: ${newPoll.question}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pollId: newPoll.id,
        poll: newPoll,
      };
      msgs.push(pollMsg);
      roomMessages.set(roomId, msgs);

      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('poll_created', newPoll);
      io.to(`room-${roomId}`).emit('message_received', pollMsg);
      io.to(`room-${roomId}`).emit('new_message', pollMsg);
    }
  );

  // 32. Polls: Vote
  socket.on(
    'vote_poll',
    ({
      roomId,
      pollId,
      optionId,
      studentName,
    }: {
      roomId: string;
      pollId: string;
      optionId: string;
      studentName: string;
    }) => {
      if (!roomId || !pollId || !optionId || !studentName) return;
      const polls = roomPolls.get(roomId) || [];
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.closed) return;

      const targetOpt = poll.options.find((o) => o.id === optionId);
      if (!targetOpt) return;

      const alreadyVoted = targetOpt.votes.includes(studentName);

      if (alreadyVoted) {
        // Retract vote
        targetOpt.votes = targetOpt.votes.filter((v) => v !== studentName);
      } else {
        if (!poll.allowMultiple) {
          // Single-choice: remove user vote from all other options
          poll.options.forEach((o) => {
            o.votes = o.votes.filter((v) => v !== studentName);
          });
        }
        targetOpt.votes.push(studentName);
      }

      // Keep embedded poll message in sync
      const msgs = roomMessages.get(roomId) || [];
      const pollMsg = msgs.find((m) => m.pollId === pollId);
      if (pollMsg) {
        pollMsg.poll = { ...poll };
      }

      saveDatabaseToDisk();
      io.to(`room-${roomId}`).emit('poll_updated', poll);
    }
  );

  // 33. Exams: Rate Paper
  socket.on(
    'rate_exam_paper',
    ({
      examId,
      studentName,
      rating,
      comment,
    }: {
      examId: string;
      studentName: string;
      rating: number;
      comment?: string;
    }) => {
      const exam = examPapers.get(examId);
      if (!exam || !studentName || typeof rating !== 'number') return;

      const numRating = Math.min(5, Math.max(1, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
      const existingIdx = exam.ratings.findIndex((r) => r.studentName.toLowerCase() === studentName.toLowerCase().trim());
      const review: ExamRatingReview = {
        id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        studentName: studentName.trim(),
        rating: numRating,
        comment: comment?.trim() || undefined,
        createdAt: Date.now(),
      };

      if (existingIdx >= 0) {
        exam.ratings[existingIdx] = review;
      } else {
        exam.ratings.push(review);
      }

      const totalScore = exam.ratings.reduce((acc, curr) => acc + curr.rating, 0);
      exam.totalVotes = exam.ratings.length;
      exam.averageRating = Number((totalScore / exam.totalVotes).toFixed(1));

      saveDatabaseToDisk();
      io.emit('exam_paper_updated', exam);
    }
  );

  // 34. Study Analytics: Log session
  socket.on(
    'log_study_session',
    ({
      studentName,
      durationMinutes,
      subject,
      focusScore,
      notes,
    }: {
      studentName: string;
      durationMinutes: number;
      subject?: string;
      focusScore?: number;
      notes?: string;
    }) => {
      if (!studentName || typeof durationMinutes !== 'number' || durationMinutes <= 0) return;
      const cleanSubject = subject?.trim() || 'General Study';
      const analytics = getOrCreateStudentAnalytics(studentName.trim());

      const sessionLog: StudySessionLog = {
        id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        subject: cleanSubject,
        durationMinutes: Math.round(durationMinutes),
        timestamp: Date.now(),
        focusScore: typeof focusScore === 'number' ? Math.min(100, Math.max(0, focusScore)) : 90,
        notes: notes?.trim() || undefined,
      };

      analytics.recentSessions.unshift(sessionLog);
      if (analytics.recentSessions.length > 20) analytics.recentSessions.pop();

      analytics.totalStudyMinutes += sessionLog.durationMinutes;
      analytics.dailyStudyMinutes += sessionLog.durationMinutes;
      analytics.weeklyStudyMinutes += sessionLog.durationMinutes;
      analytics.monthlyStudyMinutes += sessionLog.durationMinutes;
      analytics.focusSessionsCompleted += 1;

      if (!analytics.subjectBreakdown[cleanSubject]) {
        analytics.subjectBreakdown[cleanSubject] = 0;
      }
      analytics.subjectBreakdown[cleanSubject] += sessionLog.durationMinutes;

      saveDatabaseToDisk();
      socket.emit('analytics_updated', analytics);
    }
  );

  // Disconnect handler - mark member offline after grace period (handles refresh gracefully)
  socket.on('disconnect', () => {
    const sess = socketSessionMap.get(socket.id);
    if (sess) {
      const { roomId, sessionId } = sess;
      socketSessionMap.delete(socket.id);

      const disconnectKey = `${roomId}_${sessionId}`;
      if (pendingDisconnects.has(disconnectKey)) {
        clearTimeout(pendingDisconnects.get(disconnectKey));
      }

      // 3.5s Grace period: if user reloads/refreshes page, enter_room will fire within 3.5s and cancel this
      const timer = setTimeout(() => {
        pendingDisconnects.delete(disconnectKey);
        const membersMap = roomMembers.get(roomId);
        if (membersMap) {
          const mem = membersMap.get(sessionId) || membersMap.get(socket.id);
          if (mem) {
            // Check if socket was re-established
            const isReconnected = mem.socketId && Boolean(io.sockets.sockets.get(mem.socketId));
            if (!isReconnected) {
              mem.socketId = undefined;
              mem.inCall = false;
              mem.isSpeaking = false;
              mem.isTyping = false;
              mem.status = {
                activity: mem.status?.activity || 'Offline',
                customText: mem.status?.customText,
                presence: 'offline',
                updatedAt: Date.now(),
              };
              saveDatabaseToDisk();
              const membersList = Array.from(membersMap.values());
              io.to(`room-${roomId}`).emit('members_updated', membersList);
              io.to(`room-${roomId}`).emit('room_members_updated', membersList);
              io.emit('room_counts_updated', getActiveRoomCounts());
            }
          }
        }
      }, 3500);

      pendingDisconnects.set(disconnectKey, timer);
    }
  });
});

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE OR STATIC SERVING
// ---------------------------------------------------------------------------

async function startServer() {
  try {
    console.log('[Stuflix] Initializing storage abstraction and PostgreSQL layer...');
    await initializeStorage();
    const dbRooms = await getAllRooms();
    if (dbRooms && dbRooms.length > 0) {
      for (const r of dbRooms) {
        rooms.set(r.id, r);
        const msgs = await getRoomMessages(r.id);
        if (msgs.length > 0) roomMessages.set(r.id, msgs);
        const nts = await getRoomNotes(r.id);
        if (nts.length > 0) roomNotes.set(r.id, nts);
        const fls = await getRoomFiles(r.id);
        if (fls.length > 0) roomFiles.set(r.id, fls);
        const tts = await getRoomTimetables(r.id);
        if (tts.length > 0) roomTimetables.set(r.id, tts);
        const wbs = await getRoomWhiteboard(r.id);
        if (wbs.length > 0) roomWhiteboards.set(r.id, wbs);
        const tsks = await getRoomTasks(r.id);
        if (tsks.length > 0) roomTasks.set(r.id, tsks);
        const pls = await getRoomPolls(r.id);
        if (pls.length > 0) roomPolls.set(r.id, pls);
      }
      console.log(`[Stuflix] Synchronized ${rooms.size} room(s) from PostgreSQL.`);
    } else {
      loadDatabaseFromDisk();
    }
  } catch (err) {
    console.error('[Stuflix] Storage initialization fallback:', err);
    loadDatabaseFromDisk();
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Stuflix Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export { app, server };
