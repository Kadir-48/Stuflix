import { pgTable, text, boolean, jsonb, serial, bigint } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// 1. Rooms
// ---------------------------------------------------------------------------
export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  ownerName: text('owner_name').notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  avatarColor: text('avatar_color'),
  avatarIcon: text('avatar_icon'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  settings: jsonb('settings'), // Theme, tabs, member limit, notification config
});

// ---------------------------------------------------------------------------
// 2. Chat Messages
// ---------------------------------------------------------------------------
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  content: text('content').notNull(),
  timestamp: text('timestamp').notNull(),
  reactions: jsonb('reactions'),
  isPinned: boolean('is_pinned').default(false).notNull(),
  replyToId: text('reply_to_id'),
  attachments: jsonb('attachments'),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 3. Collaborative Notes
// ---------------------------------------------------------------------------
export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  lastEditedBy: text('last_edited_by').notNull(),
  updatedAt: text('updated_at').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 4. Shared Files
// ---------------------------------------------------------------------------
export const files = pgTable('files', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  size: text('size').notNull(),
  dataUrl: text('data_url').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 5. Timetables & Exam Dates
// ---------------------------------------------------------------------------
export const timetables = pgTable('timetables', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 6. Collaborative Whiteboards
// ---------------------------------------------------------------------------
export const whiteboards = pgTable('whiteboards', {
  id: serial('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  strokeId: text('stroke_id').notNull(),
  strokeData: jsonb('stroke_data').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 7. Goals & Kanban Tasks
// ---------------------------------------------------------------------------
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  column: text('column').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  dueDate: text('due_date'),
  assignee: text('assignee'),
  createdBy: text('created_by').notNull(),
  tags: jsonb('tags'),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 8. Polls
// ---------------------------------------------------------------------------
export const polls = pgTable('polls', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: jsonb('options').notNull(),
  createdBy: text('created_by').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 9. Room Members
// ---------------------------------------------------------------------------
export const roomMembers = pgTable('room_members', {
  id: serial('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  studentName: text('student_name').notNull(),
  avatarColor: text('avatar_color'),
  isOwner: boolean('is_owner').default(false),
  isHost: boolean('is_host').default(false),
  inCall: boolean('in_call').default(false),
  status: jsonb('status'),
  lastSeen: bigint('last_seen', { mode: 'number' }),
});

// ---------------------------------------------------------------------------
// 10. Student Analytics
// ---------------------------------------------------------------------------
export const studentAnalytics = pgTable('student_analytics', {
  studentName: text('student_name').primaryKey(),
  analyticsData: jsonb('analytics_data').notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ---------------------------------------------------------------------------
// 11. User Profiles & Preferences
// ---------------------------------------------------------------------------
export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey(),
  studentName: text('student_name').notNull(),
  avatarColor: text('avatar_color'),
  preferences: jsonb('preferences'),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ---------------------------------------------------------------------------
// 12. System Backups & Disaster Recovery
// ---------------------------------------------------------------------------
export const systemBackups = pgTable('system_backups', {
  id: serial('id').primaryKey(),
  backupName: text('backup_name').notNull(),
  source: text('source').notNull().default('auto_snapshot'),
  payload: jsonb('payload').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
