import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  rooms,
  messages,
  notes,
  files,
  timetables,
  whiteboards,
  tasks,
  polls,
  roomMembers,
  studentAnalytics,
  userProfiles,
  systemBackups,
} from './schema.ts';
import {
  Room,
  RoomMember,
  ChatMessage,
  Note,
  SharedFile,
  TimetableEntry,
  WhiteboardStroke,
  KanbanTask,
  Poll,
  StudentAnalytics,
} from '../types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const STUFLIX_PRIMARY_FILE = path.join(DATA_DIR, 'stuflix_store.json');
const STUDYHUB_LEGACY_FILE = path.join(DATA_DIR, 'studyhub_store.json');

// In-memory runtime cache for lightning-fast WebSocket and real-time operations
const memoryStore = {
  rooms: new Map<string, Room>(),
  messages: new Map<string, ChatMessage[]>(),
  notes: new Map<string, Note[]>(),
  files: new Map<string, SharedFile[]>(),
  timetables: new Map<string, TimetableEntry[]>(),
  whiteboards: new Map<string, WhiteboardStroke[]>(),
  tasks: new Map<string, KanbanTask[]>(),
  members: new Map<string, Map<string, RoomMember>>(),
  polls: new Map<string, Poll[]>(),
  analytics: new Map<string, StudentAnalytics>(),
  userProfiles: new Map<string, any>(),
};

let isInitialized = false;

// ---------------------------------------------------------------------------
// INITIALIZATION & MIGRATION PIPELINE
// ---------------------------------------------------------------------------

export async function initializeStorage(): Promise<void> {
  if (isInitialized) return;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  try {
    // 1. Load existing data from PostgreSQL
    console.log('[Stuflix Storage] Synchronizing state from PostgreSQL...');
    await loadFromPostgres();

    // 2. If Postgres has no rooms, check for local JSON files to migrate
    if (memoryStore.rooms.size === 0) {
      console.log('[Stuflix Storage] No existing rooms in PostgreSQL. Checking JSON storage for migration...');
      await checkAndMigrateJsonFiles();
    } else {
      console.log(`[Stuflix Storage] Loaded ${memoryStore.rooms.size} rooms directly from PostgreSQL.`);
    }

    // 3. Create initial automated recovery snapshot
    await createSnapshotBackup('system_startup_snapshot');
    isInitialized = true;
  } catch (err) {
    console.error('[Stuflix Storage] PostgreSQL load error, falling back to local files:', err);
    await checkAndMigrateJsonFiles();
    isInitialized = true;
  }
}

// ---------------------------------------------------------------------------
// POSTGRESQL SYNC
// ---------------------------------------------------------------------------

async function loadFromPostgres(): Promise<void> {
  try {
    const dbRooms = await db.select().from(rooms);
    for (const r of dbRooms) {
      memoryStore.rooms.set(r.id, {
        id: r.id,
        name: r.name,
        password: r.password,
        ownerName: r.ownerName,
        isLocked: r.isLocked,
        createdAt: Number(r.createdAt),
        avatarColor: r.avatarColor || undefined,
        avatarIcon: r.avatarIcon || undefined,
      });
    }

    const dbMessages = await db.select().from(messages);
    for (const m of dbMessages) {
      const list = memoryStore.messages.get(m.roomId) || [];
      list.push({
        id: m.id,
        authorName: m.authorName,
        content: m.content,
        timestamp: m.timestamp,
        reactions: (m.reactions as Record<string, string[]>) || {},
        isPinned: m.isPinned,
        replyTo: m.replyToId ? { id: m.replyToId, authorName: '', content: '' } : undefined,
        attachment: m.attachments ? (m.attachments as any) : undefined,
      });
      memoryStore.messages.set(m.roomId, list);
    }

    const dbNotes = await db.select().from(notes);
    for (const n of dbNotes) {
      const list = memoryStore.notes.get(n.roomId) || [];
      list.push({
        id: n.id,
        title: n.title,
        content: n.content,
        lastEditedBy: n.lastEditedBy,
        updatedAt: n.updatedAt,
      });
      memoryStore.notes.set(n.roomId, list);
    }

    const dbFiles = await db.select().from(files);
    for (const f of dbFiles) {
      const list = memoryStore.files.get(f.roomId) || [];
      list.push({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        dataUrl: f.dataUrl,
        uploadedBy: f.uploadedBy,
        uploadedAt: f.uploadedAt,
      });
      memoryStore.files.set(f.roomId, list);
    }

    const dbTimetables = await db.select().from(timetables);
    for (const t of dbTimetables) {
      const list = memoryStore.timetables.get(t.roomId) || [];
      list.push({
        id: t.id,
        subject: t.subject,
        date: t.date,
        startTime: t.startTime,
        endTime: t.endTime,
        createdBy: t.createdBy,
      });
      memoryStore.timetables.set(t.roomId, list);
    }

    const dbWhiteboards = await db.select().from(whiteboards);
    for (const w of dbWhiteboards) {
      const list = memoryStore.whiteboards.get(w.roomId) || [];
      list.push(w.strokeData as WhiteboardStroke);
      memoryStore.whiteboards.set(w.roomId, list);
    }

    const dbTasks = await db.select().from(tasks);
    for (const t of dbTasks) {
      const list = memoryStore.tasks.get(t.roomId) || [];
      list.push({
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        status: (t.column as any) || 'todo',
        priority: (t.priority as any) || 'medium',
        dueDate: t.dueDate || undefined,
        assignee: t.assignee || undefined,
        createdBy: t.createdBy,
        tags: (t.tags as string[]) || [],
        createdAt: Number(t.createdAt || Date.now()),
      });
      memoryStore.tasks.set(t.roomId, list);
    }

    const dbPolls = await db.select().from(polls);
    for (const p of dbPolls) {
      const list = memoryStore.polls.get(p.roomId) || [];
      const opts = p.options as any;
      list.push({
        id: p.id,
        roomId: p.roomId,
        authorName: p.createdBy,
        question: p.question,
        options: opts?.options || opts || [],
        allowMultiple: Boolean(opts?.allowMultiple),
        isAnonymous: Boolean(opts?.isAnonymous),
        createdAt: Number(p.createdAt || Date.now()),
        closed: !p.isActive,
      });
      memoryStore.polls.set(p.roomId, list);
    }

    const dbMembers = await db.select().from(roomMembers);
    for (const m of dbMembers) {
      let rMap = memoryStore.members.get(m.roomId);
      if (!rMap) {
        rMap = new Map<string, RoomMember>();
        memoryStore.members.set(m.roomId, rMap);
      }
      rMap.set(m.sessionId, {
        sessionId: m.sessionId,
        studentName: m.studentName,
        color: m.avatarColor || undefined,
        isOwner: Boolean(m.isOwner),
        isHost: Boolean(m.isHost),
        inCall: false,
        status: {
          presence: 'offline',
          activity: 'Offline',
          updatedAt: Date.now(),
        },
      });
    }

    const dbAnalytics = await db.select().from(studentAnalytics);
    for (const a of dbAnalytics) {
      memoryStore.analytics.set(a.studentName, a.analyticsData as StudentAnalytics);
    }

    const dbProfiles = await db.select().from(userProfiles);
    for (const p of dbProfiles) {
      memoryStore.userProfiles.set(p.id, p);
    }
  } catch (error) {
    console.error('[Stuflix Storage] Failed to load from PostgreSQL:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ---------------------------------------------------------------------------
// JSON MIGRATION (Stuflix & Legacy StudyHub)
// ---------------------------------------------------------------------------

async function checkAndMigrateJsonFiles(): Promise<void> {
  let fileToLoad: string | null = null;
  let isLegacy = false;

  if (fs.existsSync(STUFLIX_PRIMARY_FILE)) {
    fileToLoad = STUFLIX_PRIMARY_FILE;
  } else if (fs.existsSync(STUDYHUB_LEGACY_FILE)) {
    fileToLoad = STUDYHUB_LEGACY_FILE;
    isLegacy = true;
  }

  if (!fileToLoad) {
    console.log('[Stuflix Storage] No existing JSON files to migrate.');
    return;
  }

  try {
    const raw = fs.readFileSync(fileToLoad, 'utf-8');
    const parsed = JSON.parse(raw);

    console.log(`[Stuflix Storage] Migrating ${isLegacy ? 'legacy StudyHub' : 'existing Stuflix'} data into PostgreSQL...`);

    // Migrate Rooms
    if (Array.isArray(parsed.rooms)) {
      for (const [id, r] of parsed.rooms) {
        if (id && r) {
          memoryStore.rooms.set(id, r);
          try {
            await db
              .insert(rooms)
              .values({
                id: r.id,
                name: r.name,
                password: r.password,
                ownerName: r.ownerName,
                isLocked: Boolean(r.isLocked),
                avatarColor: r.avatarColor || null,
                avatarIcon: r.avatarIcon || null,
                createdAt: Number(r.createdAt || Date.now()),
                settings: null,
              })
              .onConflictDoUpdate({
                target: rooms.id,
                set: {
                  name: r.name,
                  password: r.password,
                  isLocked: Boolean(r.isLocked),
                },
              });
          } catch (e) {
            console.error(`[Stuflix Storage] Room insert skipped:`, e);
          }
        }
      }
    }

    // Migrate Messages
    if (Array.isArray(parsed.roomMessages)) {
      for (const [roomId, msgs] of parsed.roomMessages) {
        if (roomId && Array.isArray(msgs)) {
          memoryStore.messages.set(roomId, msgs);
          for (const m of msgs) {
            try {
              await db
                .insert(messages)
                .values({
                  id: m.id,
                  roomId,
                  authorName: m.authorName,
                  content: m.content,
                  timestamp: m.timestamp,
                  reactions: m.reactions || {},
                  isPinned: Boolean(m.isPinned),
                  replyToId: m.replyTo?.id || null,
                  attachments: m.attachment || null,
                  createdAt: Date.now(),
                })
                .onConflictDoNothing();
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Notes
    if (Array.isArray(parsed.roomNotes)) {
      for (const [roomId, noteList] of parsed.roomNotes) {
        if (roomId && Array.isArray(noteList)) {
          memoryStore.notes.set(roomId, noteList);
          for (const n of noteList) {
            try {
              await db
                .insert(notes)
                .values({
                  id: n.id,
                  roomId,
                  title: n.title,
                  content: n.content,
                  lastEditedBy: n.lastEditedBy,
                  updatedAt: n.updatedAt,
                  createdAt: Date.now(),
                })
                .onConflictDoNothing();
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Files
    if (Array.isArray(parsed.roomFiles)) {
      for (const [roomId, fileList] of parsed.roomFiles) {
        if (roomId && Array.isArray(fileList)) {
          memoryStore.files.set(roomId, fileList);
          for (const f of fileList) {
            try {
              await db
                .insert(files)
                .values({
                  id: f.id,
                  roomId,
                  name: f.name,
                  type: f.type,
                  size: f.size,
                  dataUrl: f.dataUrl,
                  uploadedBy: f.uploadedBy,
                  uploadedAt: f.uploadedAt,
                  createdAt: Date.now(),
                })
                .onConflictDoNothing();
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Timetables
    if (Array.isArray(parsed.roomTimetables)) {
      for (const [roomId, ttList] of parsed.roomTimetables) {
        if (roomId && Array.isArray(ttList)) {
          memoryStore.timetables.set(roomId, ttList);
          for (const t of ttList) {
            try {
              await db
                .insert(timetables)
                .values({
                  id: t.id,
                  roomId,
                  subject: t.subject,
                  date: t.date,
                  startTime: t.startTime,
                  endTime: t.endTime,
                  createdBy: t.createdBy,
                  createdAt: Date.now(),
                })
                .onConflictDoNothing();
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Tasks
    if (Array.isArray(parsed.roomTasks)) {
      for (const [roomId, taskList] of parsed.roomTasks) {
        if (roomId && Array.isArray(taskList)) {
          memoryStore.tasks.set(roomId, taskList);
          for (const t of taskList) {
            try {
              await db
                .insert(tasks)
                .values({
                  id: t.id,
                  roomId,
                  title: t.title,
                  description: t.description || null,
                  column: t.status || 'todo',
                  priority: t.priority || 'medium',
                  dueDate: t.dueDate || null,
                  assignee: t.assignee || null,
                  createdBy: t.createdBy,
                  tags: t.tags || [],
                  createdAt: Number(t.createdAt || Date.now()),
                })
                .onConflictDoNothing();
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Whiteboards
    if (Array.isArray(parsed.roomWhiteboards)) {
      for (const [roomId, strokes] of parsed.roomWhiteboards) {
        if (roomId && Array.isArray(strokes)) {
          memoryStore.whiteboards.set(roomId, strokes);
          for (const s of strokes) {
            try {
              await db
                .insert(whiteboards)
                .values({
                  roomId,
                  strokeId: s.id,
                  strokeData: s,
                  createdAt: Number(s.timestamp || Date.now()),
                });
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Members
    if (Array.isArray(parsed.roomMembers)) {
      for (const [roomId, mems] of parsed.roomMembers) {
        if (roomId && Array.isArray(mems)) {
          let map = memoryStore.members.get(roomId);
          if (!map) {
            map = new Map<string, RoomMember>();
            memoryStore.members.set(roomId, map);
          }
          for (const m of mems) {
            map.set(m.sessionId, {
              ...m,
              inCall: false,
              status: { presence: 'offline', activity: 'Offline', updatedAt: Date.now() },
            });
            try {
              await db
                .insert(roomMembers)
                .values({
                  roomId,
                  sessionId: m.sessionId,
                  studentName: m.studentName,
                  avatarColor: m.color || null,
                  isOwner: Boolean(m.isOwner),
                  isHost: Boolean(m.isHost),
                  inCall: false,
                  status: { presence: 'offline', activity: 'Offline' },
                  lastSeen: Date.now(),
                });
            } catch (e) {
              // Ignore duplicate
            }
          }
        }
      }
    }

    // Migrate Analytics
    if (Array.isArray(parsed.studentAnalytics)) {
      for (const [name, ana] of parsed.studentAnalytics) {
        if (name && ana) {
          memoryStore.analytics.set(name, ana);
          try {
            await db
              .insert(studentAnalytics)
              .values({
                studentName: name,
                analyticsData: ana,
                updatedAt: Date.now(),
              })
              .onConflictDoUpdate({
                target: studentAnalytics.studentName,
                set: { analyticsData: ana, updatedAt: Date.now() },
              });
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    // Write updated snapshot to stuflix_store.json
    saveLocalSnapshot();

    // If legacy file exists, mark as legacy safely
    if (fs.existsSync(STUDYHUB_LEGACY_FILE)) {
      const legacyPath = `${STUDYHUB_LEGACY_FILE}.migrated.legacy`;
      try {
        fs.copyFileSync(STUDYHUB_LEGACY_FILE, legacyPath);
        fs.writeFileSync(
          STUDYHUB_LEGACY_FILE,
          JSON.stringify(
            {
              _note: 'LEGACY DATA ARCHIVE: Migrated automatically into Stuflix PostgreSQL storage.',
              migratedAt: new Date().toISOString(),
              targetStorage: 'PostgreSQL / Stuflix',
            },
            null,
            2
          )
        );
        console.log('[Stuflix Storage] Legacy StudyHub data file archived and marked as legacy.');
      } catch (err) {
        console.error('[Stuflix Storage] Note on legacy file:', err);
      }
    }

    console.log('[Stuflix Storage] Migration to PostgreSQL completed successfully!');
  } catch (err) {
    console.error('[Stuflix Storage] Error during migration:', err);
  }
}

// ---------------------------------------------------------------------------
// LOCAL SNAPSHOT (Backup & Resilience Mirror)
// ---------------------------------------------------------------------------

function saveLocalSnapshot(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = {
      rooms: Array.from(memoryStore.rooms.entries()),
      roomMessages: Array.from(memoryStore.messages.entries()),
      roomNotes: Array.from(memoryStore.notes.entries()),
      roomFiles: Array.from(memoryStore.files.entries()),
      roomTimetables: Array.from(memoryStore.timetables.entries()),
      roomWhiteboards: Array.from(memoryStore.whiteboards.entries()),
      roomTasks: Array.from(memoryStore.tasks.entries()),
      roomMembers: Array.from(memoryStore.members.entries()).map(([roomId, membersMap]) => [
        roomId,
        Array.from(membersMap.values()),
      ]),
      roomPolls: Array.from(memoryStore.polls.entries()),
      studentAnalytics: Array.from(memoryStore.analytics.entries()),
      savedAt: Date.now(),
    };

    const tmpFile = `${STUFLIX_PRIMARY_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(serialized, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STUFLIX_PRIMARY_FILE);
  } catch (err) {
    console.error('[Stuflix Storage] Failed to write local snapshot:', err);
  }
}

// ---------------------------------------------------------------------------
// STORAGE ABSTRACTION API (CRUD FOR ENTITIES)
// ---------------------------------------------------------------------------

// 1. Rooms
export async function getAllRooms(): Promise<Room[]> {
  return Array.from(memoryStore.rooms.values());
}

export async function getRoomById(id: string): Promise<Room | null> {
  return memoryStore.rooms.get(id) || null;
}

export async function saveRoom(room: Room): Promise<Room> {
  memoryStore.rooms.set(room.id, room);
  saveLocalSnapshot();

  try {
    await db
      .insert(rooms)
      .values({
        id: room.id,
        name: room.name,
        password: room.password,
        ownerName: room.ownerName,
        isLocked: Boolean(room.isLocked),
        avatarColor: room.avatarColor || null,
        avatarIcon: room.avatarIcon || null,
        createdAt: Number(room.createdAt || Date.now()),
        settings: null,
      })
      .onConflictDoUpdate({
        target: rooms.id,
        set: {
          name: room.name,
          password: room.password,
          ownerName: room.ownerName,
          isLocked: Boolean(room.isLocked),
          avatarColor: room.avatarColor || null,
          avatarIcon: room.avatarIcon || null,
        },
      });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres room save error:', error);
  }

  return room;
}

export async function deleteRoom(id: string): Promise<boolean> {
  memoryStore.rooms.delete(id);
  memoryStore.messages.delete(id);
  memoryStore.notes.delete(id);
  memoryStore.files.delete(id);
  memoryStore.timetables.delete(id);
  memoryStore.whiteboards.delete(id);
  memoryStore.tasks.delete(id);
  memoryStore.members.delete(id);
  memoryStore.polls.delete(id);
  saveLocalSnapshot();

  try {
    await db.delete(rooms).where(eq(rooms.id, id));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres room delete error:', error);
  }

  return true;
}

// 2. Chat Messages
export async function getRoomMessages(roomId: string): Promise<ChatMessage[]> {
  return memoryStore.messages.get(roomId) || [];
}

export async function addMessage(roomId: string, message: ChatMessage): Promise<ChatMessage> {
  const list = memoryStore.messages.get(roomId) || [];
  const idx = list.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    list[idx] = message;
  } else {
    list.push(message);
  }
  memoryStore.messages.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db
      .insert(messages)
      .values({
        id: message.id,
        roomId,
        authorName: message.authorName,
        content: message.content,
        timestamp: message.timestamp,
        reactions: message.reactions || {},
        isPinned: Boolean(message.isPinned),
        replyToId: message.replyTo?.id || null,
        attachments: message.attachment || null,
        createdAt: Date.now(),
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('[Stuflix Storage] Postgres add message error:', error);
  }

  return message;
}

export async function updateMessage(roomId: string, updated: ChatMessage): Promise<void> {
  const list = memoryStore.messages.get(roomId) || [];
  const idx = list.findIndex((m) => m.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    memoryStore.messages.set(roomId, list);
    saveLocalSnapshot();

    try {
      await db
        .update(messages)
        .set({
          content: updated.content,
          reactions: updated.reactions || {},
          isPinned: Boolean(updated.isPinned),
        })
        .where(eq(messages.id, updated.id));
    } catch (error) {
      console.error('[Stuflix Storage] Postgres update message error:', error);
    }
  }
}

export async function deleteMessage(roomId: string, messageId: string): Promise<void> {
  const list = memoryStore.messages.get(roomId) || [];
  memoryStore.messages.set(
    roomId,
    list.filter((m) => m.id !== messageId)
  );
  saveLocalSnapshot();

  try {
    await db.delete(messages).where(eq(messages.id, messageId));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres delete message error:', error);
  }
}

// 3. Collaborative Notes
export async function getRoomNotes(roomId: string): Promise<Note[]> {
  return memoryStore.notes.get(roomId) || [];
}

export async function saveNote(roomId: string, note: Note): Promise<Note> {
  const list = memoryStore.notes.get(roomId) || [];
  const idx = list.findIndex((n) => n.id === note.id);
  if (idx !== -1) {
    list[idx] = note;
  } else {
    list.push(note);
  }
  memoryStore.notes.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db
      .insert(notes)
      .values({
        id: note.id,
        roomId,
        title: note.title,
        content: note.content,
        lastEditedBy: note.lastEditedBy,
        updatedAt: note.updatedAt,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: notes.id,
        set: {
          title: note.title,
          content: note.content,
          lastEditedBy: note.lastEditedBy,
          updatedAt: note.updatedAt,
        },
      });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres save note error:', error);
  }

  return note;
}

export async function deleteNote(roomId: string, noteId: string): Promise<void> {
  const list = memoryStore.notes.get(roomId) || [];
  memoryStore.notes.set(
    roomId,
    list.filter((n) => n.id !== noteId)
  );
  saveLocalSnapshot();

  try {
    await db.delete(notes).where(eq(notes.id, noteId));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres delete note error:', error);
  }
}

// 4. Shared Files
export async function getRoomFiles(roomId: string): Promise<SharedFile[]> {
  return memoryStore.files.get(roomId) || [];
}

export async function saveFile(roomId: string, file: SharedFile): Promise<SharedFile> {
  const list = memoryStore.files.get(roomId) || [];
  list.unshift(file);
  memoryStore.files.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db
      .insert(files)
      .values({
        id: file.id,
        roomId,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: file.dataUrl,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        createdAt: Date.now(),
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('[Stuflix Storage] Postgres save file error:', error);
  }

  return file;
}

export async function deleteFile(roomId: string, fileId: string): Promise<void> {
  const list = memoryStore.files.get(roomId) || [];
  memoryStore.files.set(
    roomId,
    list.filter((f) => f.id !== fileId)
  );
  saveLocalSnapshot();

  try {
    await db.delete(files).where(eq(files.id, fileId));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres delete file error:', error);
  }
}

// 5. Timetables & Exam Dates
export async function getRoomTimetables(roomId: string): Promise<TimetableEntry[]> {
  return memoryStore.timetables.get(roomId) || [];
}

export async function saveTimetable(roomId: string, entry: TimetableEntry): Promise<TimetableEntry> {
  const list = memoryStore.timetables.get(roomId) || [];
  const idx = list.findIndex((t) => t.id === entry.id);
  if (idx !== -1) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  memoryStore.timetables.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db
      .insert(timetables)
      .values({
        id: entry.id,
        roomId,
        subject: entry.subject,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        createdBy: entry.createdBy,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: timetables.id,
        set: {
          subject: entry.subject,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
        },
      });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres save timetable error:', error);
  }

  return entry;
}

export async function deleteTimetable(roomId: string, entryId: string): Promise<void> {
  const list = memoryStore.timetables.get(roomId) || [];
  memoryStore.timetables.set(
    roomId,
    list.filter((t) => t.id !== entryId)
  );
  saveLocalSnapshot();

  try {
    await db.delete(timetables).where(eq(timetables.id, entryId));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres delete timetable error:', error);
  }
}

// 6. Collaborative Whiteboard
export async function getRoomWhiteboard(roomId: string): Promise<WhiteboardStroke[]> {
  return memoryStore.whiteboards.get(roomId) || [];
}

export async function addWhiteboardStroke(roomId: string, stroke: WhiteboardStroke): Promise<void> {
  const list = memoryStore.whiteboards.get(roomId) || [];
  list.push(stroke);
  memoryStore.whiteboards.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db.insert(whiteboards).values({
      roomId,
      strokeId: stroke.id,
      strokeData: stroke,
      createdAt: Number(stroke.timestamp || Date.now()),
    });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres add whiteboard error:', error);
  }
}

export async function clearRoomWhiteboard(roomId: string): Promise<void> {
  memoryStore.whiteboards.set(roomId, []);
  saveLocalSnapshot();

  try {
    await db.delete(whiteboards).where(eq(whiteboards.roomId, roomId));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres clear whiteboard error:', error);
  }
}

// 7. Goals & Kanban Tasks
export async function getRoomTasks(roomId: string): Promise<KanbanTask[]> {
  return memoryStore.tasks.get(roomId) || [];
}

export async function saveTask(roomId: string, task: KanbanTask): Promise<KanbanTask> {
  const list = memoryStore.tasks.get(roomId) || [];
  const idx = list.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    list[idx] = task;
  } else {
    list.push(task);
  }
  memoryStore.tasks.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db
      .insert(tasks)
      .values({
        id: task.id,
        roomId,
        title: task.title,
        description: task.description || null,
        column: task.status,
        priority: task.priority,
        dueDate: task.dueDate || null,
        assignee: task.assignee || null,
        createdBy: task.createdBy,
        tags: task.tags || [],
        createdAt: Number(task.createdAt || Date.now()),
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: task.title,
          description: task.description || null,
          column: task.status,
          priority: task.priority,
          dueDate: task.dueDate || null,
          assignee: task.assignee || null,
          tags: task.tags || [],
        },
      });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres save task error:', error);
  }

  return task;
}

export async function deleteTask(roomId: string, taskId: string): Promise<void> {
  const list = memoryStore.tasks.get(roomId) || [];
  memoryStore.tasks.set(
    roomId,
    list.filter((t) => t.id !== taskId)
  );
  saveLocalSnapshot();

  try {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  } catch (error) {
    console.error('[Stuflix Storage] Postgres delete task error:', error);
  }
}

// 8. Polls
export async function getRoomPolls(roomId: string): Promise<Poll[]> {
  return memoryStore.polls.get(roomId) || [];
}

export async function savePoll(roomId: string, poll: Poll): Promise<Poll> {
  const list = memoryStore.polls.get(roomId) || [];
  const idx = list.findIndex((p) => p.id === poll.id);
  if (idx !== -1) {
    list[idx] = poll;
  } else {
    list.push(poll);
  }
  memoryStore.polls.set(roomId, list);
  saveLocalSnapshot();

  try {
    await db
      .insert(polls)
      .values({
        id: poll.id,
        roomId,
        question: poll.question,
        options: {
          options: poll.options,
          allowMultiple: poll.allowMultiple,
          isAnonymous: poll.isAnonymous,
        },
        createdBy: poll.authorName,
        isActive: !poll.closed,
        createdAt: Number(poll.createdAt || Date.now()),
      })
      .onConflictDoUpdate({
        target: polls.id,
        set: {
          options: {
            options: poll.options,
            allowMultiple: poll.allowMultiple,
            isAnonymous: poll.isAnonymous,
          },
          isActive: !poll.closed,
        },
      });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres save poll error:', error);
  }

  return poll;
}

// 9. Members & Presence
export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const map = memoryStore.members.get(roomId);
  return map ? Array.from(map.values()) : [];
}

export async function saveRoomMember(roomId: string, member: RoomMember): Promise<void> {
  let map = memoryStore.members.get(roomId);
  if (!map) {
    map = new Map<string, RoomMember>();
    memoryStore.members.set(roomId, map);
  }
  map.set(member.sessionId, member);
  saveLocalSnapshot();

  try {
    await db.insert(roomMembers).values({
      roomId,
      sessionId: member.sessionId,
      studentName: member.studentName,
      avatarColor: member.color || null,
      isOwner: Boolean(member.isOwner),
      isHost: Boolean(member.isHost),
      inCall: Boolean(member.inCall),
      status: member.status || null,
      lastSeen: Date.now(),
    });
  } catch (error) {
    // Non-blocking for presence
  }
}

export async function updateMemberPresence(
  roomId: string,
  sessionId: string,
  updates: Partial<RoomMember>
): Promise<void> {
  const map = memoryStore.members.get(roomId);
  if (map && map.has(sessionId)) {
    const existing = map.get(sessionId)!;
    const updated = { ...existing, ...updates };
    map.set(sessionId, updated);
    saveLocalSnapshot();
  }
}

// 10. Student Analytics
export async function getStudentAnalytics(studentName: string): Promise<StudentAnalytics | null> {
  const clean = studentName.trim();
  return memoryStore.analytics.get(clean) || null;
}

export async function saveStudentAnalytics(studentName: string, data: StudentAnalytics): Promise<void> {
  const clean = studentName.trim();
  memoryStore.analytics.set(clean, data);
  saveLocalSnapshot();

  try {
    await db
      .insert(studentAnalytics)
      .values({
        studentName: clean,
        analyticsData: data,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: studentAnalytics.studentName,
        set: {
          analyticsData: data,
          updatedAt: Date.now(),
        },
      });
  } catch (error) {
    console.error('[Stuflix Storage] Postgres save analytics error:', error);
  }
}

// ---------------------------------------------------------------------------
// BACKUP AND DISASTER RECOVERY
// ---------------------------------------------------------------------------

export async function createSnapshotBackup(backupName?: string): Promise<{ id?: number; name: string; timestamp: number }> {
  const name = backupName || `stuflix_backup_${Date.now()}`;
  const timestamp = Date.now();

  const payload = {
    backupName: name,
    timestamp,
    rooms: Array.from(memoryStore.rooms.entries()),
    messages: Array.from(memoryStore.messages.entries()),
    notes: Array.from(memoryStore.notes.entries()),
    files: Array.from(memoryStore.files.entries()),
    timetables: Array.from(memoryStore.timetables.entries()),
    whiteboards: Array.from(memoryStore.whiteboards.entries()),
    tasks: Array.from(memoryStore.tasks.entries()),
    members: Array.from(memoryStore.members.entries()).map(([rid, map]) => [rid, Array.from(map.values())]),
    polls: Array.from(memoryStore.polls.entries()),
    analytics: Array.from(memoryStore.analytics.entries()),
  };

  // 1. Write file snapshot to disk
  try {
    const filePath = path.join(BACKUP_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Stuflix Storage] Local backup file error:', err);
  }

  // 2. Persist to PostgreSQL system_backups table
  let dbBackupId: number | undefined;
  try {
    const res = await db
      .insert(systemBackups)
      .values({
        backupName: name,
        source: 'stuflix_engine',
        payload,
        createdAt: timestamp,
      })
      .returning({ id: systemBackups.id });
    if (res && res[0]) {
      dbBackupId = res[0].id;
    }
  } catch (err) {
    console.error('[Stuflix Storage] PostgreSQL backup insert error:', err);
  }

  console.log(`[Stuflix Storage] Backup created: ${name} (DB ID: ${dbBackupId || 'file-only'})`);
  return { id: dbBackupId, name, timestamp };
}

export async function listBackups(): Promise<{ id?: number; name: string; createdAt: number; source: string }[]> {
  try {
    const dbBackups = await db.select().from(systemBackups);
    return dbBackups.map((b) => ({
      id: b.id,
      name: b.backupName,
      createdAt: Number(b.createdAt),
      source: b.source,
    }));
  } catch (err) {
    // Read from backup folder
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
      return files.map((f) => ({
        name: f.replace('.json', ''),
        createdAt: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
        source: 'filesystem',
      }));
    }
    return [];
  }
}

export async function restoreFromBackup(backupNameOrId: string | number): Promise<boolean> {
  try {
    let payload: any = null;

    if (typeof backupNameOrId === 'number') {
      const dbRes = await db.select().from(systemBackups).where(eq(systemBackups.id, backupNameOrId));
      if (dbRes && dbRes[0]) {
        payload = dbRes[0].payload;
      }
    } else {
      const filePath = path.join(BACKUP_DIR, `${backupNameOrId}.json`);
      if (fs.existsSync(filePath)) {
        payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

    if (!payload) return false;

    // Restore memory structures
    if (Array.isArray(payload.rooms)) {
      for (const [id, r] of payload.rooms) memoryStore.rooms.set(id, r);
    }
    if (Array.isArray(payload.messages)) {
      for (const [id, msgs] of payload.messages) memoryStore.messages.set(id, msgs);
    }
    if (Array.isArray(payload.notes)) {
      for (const [id, n] of payload.notes) memoryStore.notes.set(id, n);
    }
    if (Array.isArray(payload.files)) {
      for (const [id, fls] of payload.files) memoryStore.files.set(id, fls);
    }
    if (Array.isArray(payload.timetables)) {
      for (const [id, tts] of payload.timetables) memoryStore.timetables.set(id, tts);
    }
    if (Array.isArray(payload.whiteboards)) {
      for (const [id, wbs] of payload.whiteboards) memoryStore.whiteboards.set(id, wbs);
    }
    if (Array.isArray(payload.tasks)) {
      for (const [id, ts] of payload.tasks) memoryStore.tasks.set(id, ts);
    }
    if (Array.isArray(payload.polls)) {
      for (const [id, pls] of payload.polls) memoryStore.polls.set(id, pls);
    }
    if (Array.isArray(payload.analytics)) {
      for (const [name, ana] of payload.analytics) memoryStore.analytics.set(name, ana);
    }

    saveLocalSnapshot();
    return true;
  } catch (err) {
    console.error('[Stuflix Storage] Failed to restore backup:', err);
    return false;
  }
}
