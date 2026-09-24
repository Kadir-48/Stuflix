import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Hash,
  Lock,
  Copy,
  Check,
  MessageSquare,
  FileText,
  Files,
  Video,
  VideoOff,
  Calendar,
  Sun,
  Moon,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  PenTool,
  CheckSquare,
  LogOut,
  BarChart2,
  Star,
  BarChart3,
  Sparkles,
  Maximize2,
  Minimize2,
  Headphones,
  Settings,
} from 'lucide-react';
import {
  Room,
  RoomMember,
  ChatMessage,
  Note,
  SharedFile,
  TimetableEntry,
  WhiteboardStroke,
  KanbanTask,
  TaskStatus,
  TaskPriority,
  Poll,
  UserStatus,
} from '../types';
import { Sidebar } from './Sidebar';
import { Clock } from './Clock';
import { ChatPanel } from './room/ChatPanel';
import { NotesEditor } from './room/NotesEditor';
import { FilesManager } from './room/FilesManager';
import { TimetableManager } from './room/TimetableManager';
import { SharedWhiteboard } from './room/SharedWhiteboard';
import { KanbanBoard } from './room/KanbanBoard';
import { StudyCallRoom, StudyCallRoomHandle } from './call/StudyCallRoom';
import { FloatingCallBar, CallInfoState } from './call/FloatingCallBar';
import { RoomAvatar } from './room/RoomAvatar';
import { UserStatusBadge } from './status/UserStatusBadge';
import { StatusPickerModal } from './status/StatusPickerModal';
import { PollsView } from './polls/PollsView';
import { ExamDifficultyView } from './exams/ExamDifficultyView';
import { StudyAnalyticsView } from './analytics/StudyAnalyticsView';
import { FocusSoundsModal } from './sounds/FocusSoundsModal';
import { AppSettingsModal } from './settings/AppSettingsModal';
import { FocusModeAudioBar } from './sounds/FocusModeAudioBar';
import { useFocusSounds } from '../context/FocusSoundsContext';
import { getSocket } from '../lib/socket';
import { safeFetchJson } from '../lib/api';

interface RoomViewProps {
  room: Room;
  joinedRooms: Room[];
  currentStudentName: string;
  sessionId: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectRoom: (room: Room) => void;
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onLeaveRoom: (roomId: string) => void;
  onLogout: () => void;
}

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const RoomView: React.FC<RoomViewProps> = ({
  room,
  joinedRooms,
  currentStudentName,
  sessionId,
  isDarkMode,
  onToggleDarkMode,
  onSelectRoom,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onLeaveRoom,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'messages' | 'notes' | 'files' | 'tasks' | 'whiteboard' | 'call' | 'timetable' | 'polls' | 'exams' | 'analytics'
  >('messages');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Focus Mode & Ambience States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFocusSoundsOpen, setIsFocusSoundsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isPlaying, activeTracks } = useFocusSounds();

  // Dual-Layer User Status State
  const [currentUserStatus, setCurrentUserStatus] = useState<UserStatus>({
    presence: 'online',
    activity: '📚 Studying',
  });
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);

  // Room state from server
  const [currentRoomData, setCurrentRoomData] = useState<Room>(room);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Call status for indicator badge & persistent background call
  const [isCallActive, setIsCallActive] = useState(false);
  const callRoomRef = useRef<StudyCallRoomHandle | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfoState>({
    inCall: false,
    isMicEnabled: true,
    isCamEnabled: true,
    isScreenSharing: false,
    participantCount: 0,
    activeSpeaker: null,
    participantNames: [],
  });
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'messages') {
      setUnreadMessages(0);
    }
  }, [activeTab]);

  // Tab change logging
  const handleTabChange = (tab: typeof activeTab) => {
    console.log('[Tab change] Active tab switched to:', tab);
    setActiveTab(tab);
  };

  // Component Mount/Unmount Diagnostics
  useEffect(() => {
    console.log('[Component mount] RoomView mounted for room:', room.id, 'Student:', currentStudentName);
    return () => {
      console.log('[Component unmount] RoomView unmounted for room:', room.id);
    };
  }, [room.id, currentStudentName]);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    // When Focus Mode is enabled: Mute notifications
    if (isFocusMode) return;

    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Escape key to exit Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  const currentRoomIdRef = useRef(room.id);
  useEffect(() => {
    currentRoomIdRef.current = room.id;
    setCurrentRoomData(room);
  }, [room]);

  // Pre-fetch complete persistent room data from REST endpoint for immediate display
  useEffect(() => {
    safeFetchJson<{
      success: boolean;
      room?: Room;
      messages?: ChatMessage[];
      notes?: Note[];
      files?: SharedFile[];
      timetables?: TimetableEntry[];
      whiteboardStrokes?: WhiteboardStroke[];
      tasks?: KanbanTask[];
      members?: RoomMember[];
      polls?: Poll[];
    }>(`/api/rooms/${room.id}/data`).then((res) => {
      if (res.ok && res.data?.success) {
        if (res.data.messages) setMessages(res.data.messages);
        if (res.data.notes) setNotes(res.data.notes);
        if (res.data.files) setFiles(res.data.files);
        if (res.data.timetables) setTimetables(res.data.timetables);
        if (res.data.whiteboardStrokes) setWhiteboardStrokes(res.data.whiteboardStrokes);
        if (res.data.tasks) setTasks(res.data.tasks);
        if (res.data.members) setMembers(res.data.members);
        if (res.data.polls) setPolls(res.data.polls);
        if (res.data.room) setCurrentRoomData(res.data.room);
      }
    });
  }, [room.id]);

  // Socket connection & event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit('enter_room', {
      roomId: room.id,
      studentName: currentStudentName,
      sessionId,
    });

    const handleRoomData = (data: {
      room?: Room;
      messages?: ChatMessage[];
      notes?: Note[];
      files?: SharedFile[];
      timetables?: TimetableEntry[];
      members?: RoomMember[];
      whiteboardStrokes?: WhiteboardStroke[];
      tasks?: KanbanTask[];
      polls?: Poll[];
    }) => {
      if (data.messages) setMessages(data.messages);
      if (data.notes) setNotes(data.notes);
      if (data.files) setFiles(data.files);
      if (data.timetables) setTimetables(data.timetables);
      if (data.whiteboardStrokes) setWhiteboardStrokes(data.whiteboardStrokes);
      if (data.tasks) setTasks(data.tasks);
      if (data.members) setMembers(data.members);
      if (data.polls) setPolls(data.polls);
      if (data.room) setCurrentRoomData(data.room);
    };

    const handleNewMessage = (msg: ChatMessage) => {
      console.log('[Message receive] Received message in room:', room.id, 'ID:', msg.id, 'Author:', msg.authorName);
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === msg.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...msg };
          return updated;
        }
        return [...prev, msg];
      });
      if (activeTabRef.current !== 'messages') {
        setUnreadMessages((u) => u + 1);
        if (msg.authorName !== currentStudentName) {
          addToast(
            `New message from ${msg.authorName}`,
            msg.content ? (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) : '[Attachment]',
            'info'
          );
        }
      }
    };

    const handleMessageUpdated = (msg: ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleReactionsUpdated = ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };

    const handlePinnedUpdated = ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m)));
      addToast(
        'Pinned Message',
        isPinned ? 'A message was pinned to the room.' : 'A message was unpinned.',
        'info'
      );
    };

    const handleUserTyping = ({ studentName, isTyping }: { studentName: string; isTyping: boolean }) => {
      if (studentName === currentStudentName) return;
      setTypingUsers((prev) =>
        isTyping ? (prev.includes(studentName) ? prev : [...prev, studentName]) : prev.filter((u) => u !== studentName)
      );
    };

    const handleNoteCreated = (note: Note) => {
      setNotes((prev) => {
        if (prev.some((n) => n.id === note.id)) return prev;
        return [...prev, note];
      });
      if (note.lastEditedBy !== currentStudentName) {
        addToast('New Note Created', `${note.lastEditedBy} created note "${note.title}"`, 'info');
      }
    };

    const handleNoteUpdated = (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    };

    const handleNoteDeleted = ({ noteId }: { noteId: string }) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    };

    const handleFileUploaded = (file: SharedFile) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [file, ...prev];
      });
      if (file.uploadedBy !== currentStudentName) {
        addToast('New Study File', `${file.uploadedBy} uploaded "${file.name}" (${file.size})`, 'success');
      }
    };

    const handleFileDeleted = ({ fileId }: { fileId: string }) => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const handleTimetableCreated = (entry: TimetableEntry) => {
      setTimetables((prev) => {
        if (prev.some((t) => t.id === entry.id)) return prev;
        return [...prev, entry];
      });
      if (entry.createdBy !== currentStudentName) {
        addToast('Timetable Entry', `${entry.createdBy} added "${entry.subject}" exam on ${entry.date}`, 'info');
      }
    };

    const handleTimetableUpdated = (entry: TimetableEntry) => {
      setTimetables((prev) => prev.map((t) => (t.id === entry.id ? entry : t)));
    };

    const handleTimetableDeleted = ({ entryId }: { entryId: string }) => {
      setTimetables((prev) => prev.filter((t) => t.id !== entryId));
    };

    const handleMembersUpdated = (payload: any) => {
      const list: RoomMember[] = Array.isArray(payload) ? payload : (payload?.members || []);
      setMembers(list);
      // Check if anyone is in call
      const anyInCall = list.some((m) => m.inCall);
      setIsCallActive(anyInCall);
    };

    const handleRoomUpdated = (updatedRoom: Room) => {
      setCurrentRoomData(updatedRoom);
      try {
        const saved = localStorage.getItem('stuflix_my_rooms');
        if (saved) {
          const list: Room[] = JSON.parse(saved);
          const updated = list.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
          localStorage.setItem('stuflix_my_rooms', JSON.stringify(updated));
        }
      } catch {}
    };

    const handleRoomPasswordUpdated = ({ password, room: r }: { password: string; room?: Room }) => {
      setCurrentRoomData((prev) => ({ ...prev, password }));
      try {
        const saved = localStorage.getItem('stuflix_my_rooms');
        if (saved) {
          const list: Room[] = JSON.parse(saved);
          const updated = list.map((rm) => (rm.id === room.id ? { ...rm, password } : rm));
          localStorage.setItem('stuflix_my_rooms', JSON.stringify(updated));
        }
      } catch {}
      addToast('Room Password Updated', 'The permanent room password has been updated by the host.', 'info');
    };

    const handleRoomDeleted = () => {
      addToast('Room Closed', `Room "${room.name}" was closed by the host.`, 'info');
      onLeaveRoom(room.id);
    };

    const handleMemberRemoved = ({ targetSessionId }: { targetSessionId: string }) => {
      if (targetSessionId === sessionId) {
        addToast('Removed from Room', `You were removed from room "${room.name}".`, 'info');
        onLeaveRoom(room.id);
      }
    };

    const handleTaskCreated = (newTask: KanbanTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
      if (newTask.createdBy !== currentStudentName) {
        addToast('New Study Goal', `${newTask.createdBy} added: ${newTask.title}`, 'info');
      }
    };

    const handleTaskUpdated = (updatedTask: KanbanTask) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    };

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    };

    const handlePollCreated = (newPoll: Poll) => {
      setPolls((prev) => {
        if (prev.some((p) => p.id === newPoll.id)) return prev;
        return [newPoll, ...prev];
      });
      if (newPoll.authorName !== currentStudentName) {
        addToast('New Room Poll', `${newPoll.authorName} asked: "${newPoll.question}"`, 'info');
      }
    };

    const handlePollUpdated = (updatedPoll: Poll) => {
      setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    };

    // Automatic reconnection resilience: re-enter room on connect or network restore
    const syncEnterRoom = () => {
      console.log('[Room join] Student', currentStudentName, 'entering room:', room.id);
      socket.emit('enter_room', {
        roomId: room.id,
        studentName: currentStudentName,
        sessionId,
      });
    };

    if (socket.connected) {
      syncEnterRoom();
    }
    socket.on('connect', syncEnterRoom);
    socket.on('reconnect', syncEnterRoom);

    socket.on('room_data', handleRoomData);
    socket.on('new_message', handleNewMessage);
    socket.on('message_received', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_edited', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_reactions_updated', handleReactionsUpdated);
    socket.on('reaction_updated', handleReactionsUpdated);
    socket.on('message_pinned_updated', handlePinnedUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('note_created', handleNoteCreated);
    socket.on('note_updated', handleNoteUpdated);
    socket.on('note_deleted', handleNoteDeleted);
    socket.on('file_uploaded', handleFileUploaded);
    socket.on('file_deleted', handleFileDeleted);
    socket.on('timetable_created', handleTimetableCreated);
    socket.on('timetable_entry_created', handleTimetableCreated);
    socket.on('timetable_updated', handleTimetableUpdated);
    socket.on('timetable_entry_updated', handleTimetableUpdated);
    socket.on('timetable_deleted', handleTimetableDeleted);
    socket.on('timetable_entry_deleted', handleTimetableDeleted);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('poll_created', handlePollCreated);
    socket.on('poll_updated', handlePollUpdated);
    socket.on('room_members_updated', handleMembersUpdated);
    socket.on('members_updated', handleMembersUpdated);
    socket.on('room_updated', handleRoomUpdated);
    socket.on('room_password_updated', handleRoomPasswordUpdated);
    socket.on('room_deleted', handleRoomDeleted);
    socket.on('member_removed', handleMemberRemoved);

    // Heartbeat ping interval every 10s
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat', {
        roomId: room.id,
        sessionId,
        studentName: currentStudentName,
      });
    }, 10000);

    return () => {
      console.log('[Room leave] Cleanup running for student', currentStudentName, 'in room:', room.id);
      clearInterval(heartbeatInterval);
      socket.off('connect', syncEnterRoom);
      socket.off('reconnect', syncEnterRoom);
      socket.off('room_data', handleRoomData);
      socket.off('new_message', handleNewMessage);
      socket.off('message_received', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_edited', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_reactions_updated', handleReactionsUpdated);
      socket.off('reaction_updated', handleReactionsUpdated);
      socket.off('message_pinned_updated', handlePinnedUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('note_created', handleNoteCreated);
      socket.off('note_updated', handleNoteUpdated);
      socket.off('note_deleted', handleNoteDeleted);
      socket.off('file_uploaded', handleFileUploaded);
      socket.off('file_deleted', handleFileDeleted);
      socket.off('timetable_created', handleTimetableCreated);
      socket.off('timetable_entry_created', handleTimetableCreated);
      socket.off('timetable_updated', handleTimetableUpdated);
      socket.off('timetable_entry_updated', handleTimetableUpdated);
      socket.off('timetable_deleted', handleTimetableDeleted);
      socket.off('timetable_entry_deleted', handleTimetableDeleted);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('poll_created', handlePollCreated);
      socket.off('poll_updated', handlePollUpdated);
      socket.off('room_members_updated', handleMembersUpdated);
      socket.off('members_updated', handleMembersUpdated);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('room_password_updated', handleRoomPasswordUpdated);
      socket.off('room_deleted', handleRoomDeleted);
      socket.off('member_removed', handleMemberRemoved);
      socket.off('connect', syncEnterRoom);
      socket.off('reconnect', syncEnterRoom);
    };
  }, [room.id, currentStudentName, sessionId]);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(currentRoomData.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleConfirmLeave = () => {
    const socket = getSocket();
    socket.emit('leave_room', {
      roomId: currentRoomData.id,
      sessionId,
      studentName: currentStudentName,
    });
    onLeaveRoom(currentRoomData.id);
  };

  const handleConfirmLogout = () => {
    const socket = getSocket();
    socket.emit('leave_room', {
      roomId: currentRoomData.id,
      sessionId,
      studentName: currentStudentName,
    });
    onLogout();
  };

  // Socket emit wrappers for child components with instant optimistic local update & dual-delivery
  const handleSendMessage = (payload: {
    content: string;
    replyTo?: { id: string; authorName: string; content: string };
    attachment?: { name: string; type: string; size: string; dataUrl: string };
  }) => {
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newMsg: ChatMessage = {
      id: msgId,
      authorName: currentStudentName,
      content: payload.content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: payload.replyTo,
      attachment: payload.attachment,
      reactions: {},
      isPinned: false,
      edited: false,
    };

    // 1. Instant local render (0ms optimistic latency)
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    // 2. Real-time broadcast over WebSocket
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('send_message', {
        id: msgId,
        roomId: currentRoomData.id,
        content: payload.content,
        replyTo: payload.replyTo,
        attachment: payload.attachment,
        authorName: currentStudentName,
        sessionId,
      });
    }

    // 3. Reliable persistence & offline sync fallback
    fetch(`/api/rooms/${currentRoomData.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msgId,
        content: payload.content,
        replyTo: payload.replyTo,
        attachment: payload.attachment,
        authorName: currentStudentName,
        sessionId,
      }),
    }).catch((err) => {
      console.warn('REST message delivery backup note:', err);
    });
  };

  const handleEditMessage = (messageId: string, content: string) => {
    getSocket().emit('edit_message', {
      roomId: currentRoomData.id,
      messageId,
      content,
      studentName: currentStudentName,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    getSocket().emit('delete_message', {
      roomId: currentRoomData.id,
      messageId,
      studentName: currentStudentName,
    });
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    getSocket().emit('toggle_message_reaction', {
      roomId: currentRoomData.id,
      messageId,
      emoji,
      studentName: currentStudentName,
    });
  };

  const handlePinMessage = (messageId: string, isPinned: boolean) => {
    getSocket().emit('pin_message', {
      roomId: currentRoomData.id,
      messageId,
      isPinned,
      studentName: currentStudentName,
    });
  };

  const handleTyping = (isTyping: boolean) => {
    getSocket().emit('typing', {
      roomId: currentRoomData.id,
      studentName: currentStudentName,
      isTyping,
    });
  };

  const handleCreateNote = (title: string) => {
    getSocket().emit('create_note', {
      roomId: currentRoomData.id,
      title,
      studentName: currentStudentName,
    });
  };

  const handleUpdateNote = (noteId: string, updates: { title?: string; content?: string }) => {
    getSocket().emit('update_note', {
      roomId: currentRoomData.id,
      noteId,
      updates,
      studentName: currentStudentName,
    });
  };

  const handleDeleteNote = (noteId: string) => {
    getSocket().emit('delete_note', {
      roomId: currentRoomData.id,
      noteId,
      studentName: currentStudentName,
    });
  };

  const handleUploadFile = (file: { name: string; type: string; size: string; dataUrl: string }) => {
    getSocket().emit('upload_file', {
      roomId: currentRoomData.id,
      file,
      studentName: currentStudentName,
    });
  };

  const handleDeleteFile = (fileId: string) => {
    getSocket().emit('delete_file', {
      roomId: currentRoomData.id,
      fileId,
      studentName: currentStudentName,
    });
  };

  const handleCreateTimetable = (entry: { subject: string; date: string; startTime: string; endTime: string }) => {
    getSocket().emit('create_timetable', {
      roomId: currentRoomData.id,
      entry,
      studentName: currentStudentName,
    });
  };

  const handleUpdateTimetable = (entryId: string, entry: Partial<TimetableEntry>) => {
    getSocket().emit('update_timetable', {
      roomId: currentRoomData.id,
      entryId,
      updates: entry,
      studentName: currentStudentName,
    });
  };

  const handleDeleteTimetable = (entryId: string) => {
    getSocket().emit('delete_timetable', {
      roomId: currentRoomData.id,
      entryId,
      studentName: currentStudentName,
    });
  };

  const handleCreateTask = (taskData: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    dueDate?: string;
    tags?: string[];
  }) => {
    getSocket().emit('create_task', {
      roomId: currentRoomData.id,
      task: taskData,
      studentName: currentStudentName,
    });
  };

  const handleUpdateTask = (taskId: string, updates: Partial<KanbanTask>) => {
    getSocket().emit('update_task', {
      roomId: currentRoomData.id,
      taskId,
      updates,
    });
  };

  const handleMoveTask = (taskId: string, newStatus: TaskStatus) => {
    getSocket().emit('move_task', {
      roomId: currentRoomData.id,
      taskId,
      newStatus,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    getSocket().emit('delete_task', {
      roomId: currentRoomData.id,
      taskId,
    });
  };

  const handleToggleLockRoom = (isLocked: boolean) => {
    getSocket().emit('toggle_lock_room', {
      roomId: currentRoomData.id,
      isLocked,
      studentName: currentStudentName,
    });
  };

  const handleChangePassword = (newPassword: string) => {
    getSocket().emit('change_room_password', {
      roomId: currentRoomData.id,
      newPassword,
      studentName: currentStudentName,
    });
    setCurrentRoomData((prev) => ({ ...prev, password: newPassword }));
    try {
      const saved = localStorage.getItem('stuflix_my_rooms');
      if (saved) {
        const list = JSON.parse(saved);
        const updated = list.map((r: Room) => (r.id === currentRoomData.id ? { ...r, password: newPassword } : r));
        localStorage.setItem('stuflix_my_rooms', JSON.stringify(updated));
      }
    } catch {}
    addToast('Password Changed', 'Room password updated. It will remain permanently active.', 'success');
  };

  const handleRemoveMember = (targetSessionId: string) => {
    getSocket().emit('remove_member', {
      roomId: currentRoomData.id,
      targetSessionId,
      studentName: currentStudentName,
    });
  };

  const handleDeleteRoom = () => {
    getSocket().emit('delete_room', {
      roomId: currentRoomData.id,
      studentName: currentStudentName,
    });
  };

  const handleCallStateChange = (
    inCall: boolean,
    isMuted: boolean,
    isVideoOff: boolean,
    isScreenSharing: boolean
  ) => {
    setIsCallActive(inCall);
    setCallInfo((prev) => ({
      ...prev,
      inCall,
      isMicEnabled: !isMuted,
      isCamEnabled: !isVideoOff,
      isScreenSharing,
    }));
    getSocket().emit('update_call_status', {
      roomId: currentRoomData.id,
      studentName: currentStudentName,
      inCall,
      isMuted,
      isVideoOff,
      isScreenSharing,
    });
  };

  const handleLeaveCall = () => {
    setIsCallActive(false);
    setCallInfo({
      inCall: false,
      isMicEnabled: true,
      isCamEnabled: true,
      isScreenSharing: false,
      participantCount: 0,
      activeSpeaker: null,
      participantNames: [],
    });
    getSocket().emit('update_call_status', {
      roomId: currentRoomData.id,
      studentName: currentStudentName,
      inCall: false,
      isMuted: true,
      isVideoOff: true,
      isScreenSharing: false,
    });
  };

  const handleCreatePoll = (payload: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    isAnonymous: boolean;
  }) => {
    getSocket().emit('create_poll', {
      roomId: currentRoomData.id,
      authorName: currentStudentName,
      ...payload,
    });
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    getSocket().emit('vote_poll', {
      roomId: currentRoomData.id,
      pollId,
      optionId,
      studentName: currentStudentName,
    });
  };

  const handleUpdateStatus = (newStatus: UserStatus) => {
    setCurrentUserStatus(newStatus);
    getSocket().emit('update_status', {
      roomId: currentRoomData.id,
      studentName: currentStudentName,
      status: newStatus,
    });
  };

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden font-sans transition-colors duration-150">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && !isFocusMode && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container (hidden in Focus Mode) */}
      {!isFocusMode && (
        <div
          className={`fixed md:static inset-y-0 left-0 z-40 transform ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } transition-transform duration-200 ease-in-out md:flex flex-shrink-0`}
        >
          <Sidebar
            rooms={joinedRooms}
            currentRoom={currentRoomData}
            currentStudentName={currentStudentName}
            members={members}
            isDarkMode={isDarkMode}
            currentUserStatus={currentUserStatus}
            onOpenStatusPicker={() => setIsStatusPickerOpen(true)}
            onOpenFocusSounds={() => setIsFocusSoundsOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleDarkMode={onToggleDarkMode}
            onSelectRoom={(r) => {
              onSelectRoom(r);
              setIsMobileSidebarOpen(false);
            }}
            onOpenCreateRoom={() => {
              onOpenCreateRoom();
              setIsMobileSidebarOpen(false);
            }}
            onOpenJoinRoom={() => {
              onOpenJoinRoom();
              setIsMobileSidebarOpen(false);
            }}
            onLeaveApp={handleConfirmLeave}
            onLogout={handleConfirmLogout}
            onOpenLeaveRoom={handleConfirmLeave}
            onToggleLockRoom={handleToggleLockRoom}
            onChangePassword={handleChangePassword}
            onRemoveMember={handleRemoveMember}
            onDeleteRoom={handleDeleteRoom}
          />
        </div>
      )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
        {/* Top Header Bar */}
        <header className="h-14 px-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0 z-10 gap-2 sm:gap-3">
          {/* Left: Mobile hamburger & Room Title */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <RoomAvatar
                color={currentRoomData.avatarColor || 'blue'}
                icon={currentRoomData.avatarIcon || 'book'}
                size="sm"
              />
              <h1 className="font-bold text-slate-900 dark:text-white text-xs sm:text-base truncate max-w-[110px] sm:max-w-[200px]">
                {currentRoomData.name}
              </h1>
            </div>
            <button
              onClick={handleCopyPassword}
              title="Copy room password to invite friends"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 font-mono transition cursor-pointer"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>{currentRoomData.password}</span>
              {copiedPassword ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
            </button>
          </div>

          {/* Center: Tabs Navigation */}
          <nav className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl flex-shrink-0 overflow-x-auto max-w-[55vw] sm:max-w-none">
            {/* Messages */}
            <button
              onClick={() => {
                setActiveTab('messages');
                setUnreadMessages(0);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap relative ${
                activeTab === 'messages'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Messages</span>
              {unreadMessages > 0 && activeTab !== 'messages' && (
                <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold animate-pulse">
                  {unreadMessages}
                </span>
              )}
            </button>

            {/* Notes */}
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Notes</span>
            </button>

            {/* Polls (WhatsApp-style) */}
            <button
              onClick={() => setActiveTab('polls')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'polls'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Polls</span>
              {polls.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">
                  {polls.length}
                </span>
              )}
            </button>

            {/* Exam Difficulty Rating */}
            <button
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'exams'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Exams</span>
            </button>

            {/* Study Analytics Dashboard */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
              <span>Analytics</span>
            </button>

            {/* Tasks / Goals */}
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Goals</span>
              {tasks.filter((t) => t.status !== 'completed').length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">
                  {tasks.filter((t) => t.status !== 'completed').length}
                </span>
              )}
            </button>

            {/* Whiteboard */}
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'whiteboard'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Whiteboard</span>
            </button>

            {/* Call */}
            <button
              onClick={() => setActiveTab('call')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap relative ${
                activeTab === 'call'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Call</span>
              {(isCallActive || callInfo.inCall) && (
                <span className="flex items-center gap-1 ml-1 px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Live</span>
                </span>
              )}
            </button>

            {/* Files */}
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'files'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Files</span>
            </button>

            {/* Timetable */}
            <button
              onClick={() => setActiveTab('timetable')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'timetable'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Timetable</span>
            </button>
          </nav>

          {/* Right: Status, Focus Mode, Ambience, Settings, Theme Toggle & Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Dual-Layer User Status Badge in Header */}
            <div className="hidden xl:flex items-center">
              <UserStatusBadge
                status={currentUserStatus}
                size="sm"
                onClick={() => setIsStatusPickerOpen(true)}
              />
            </div>

            {/* Focus Sounds / Ambience Button */}
            <button
              onClick={() => setIsFocusSoundsOpen(true)}
              title="Focus Sounds & Study Ambience"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isPlaying
                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ambience</span>
              {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />}
            </button>

            {/* Focus Mode Toggle */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? 'Exit Focus Mode (Esc)' : 'Enter Distraction-Free Focus Mode'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isFocusMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isFocusMode ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="hidden sm:inline">{isFocusMode ? 'Exit Focus' : 'Focus'}</span>
            </button>

            {/* App Settings Modal */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="App Settings & Notifications"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div className="hidden lg:block">
              <Clock />
            </div>

            <button
              onClick={handleConfirmLeave}
              title="Leave this study room and return to room list"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Leave Room</span>
            </button>
          </div>
        </header>

        {/* Focus Mode Banner (Visible when Focus Mode is Active) */}
        {isFocusMode && (
          <div className="h-10 px-4 bg-amber-500 dark:bg-amber-600 text-white text-xs font-medium flex items-center justify-between shadow-xs flex-shrink-0 z-20 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold flex items-center gap-1 flex-shrink-0">
                🧘 Focus Mode
              </span>
              <span className="hidden md:inline text-amber-100 truncate">
                • Sidebar & distractions hidden, notifications muted
              </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Focus Mode Quick Ambience Player */}
              <FocusModeAudioBar onOpenSoundPicker={() => setIsFocusSoundsOpen(true)} />

              <button
                onClick={() => setIsFocusMode(false)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>Exit Focus</span>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden relative">
          {activeTab === 'messages' && (
            <ChatPanel
              room={currentRoomData}
              messages={messages}
              currentStudentName={currentStudentName}
              members={members}
              typingUsers={typingUsers}
              isDarkMode={isDarkMode}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onPinMessage={handlePinMessage}
              onTyping={handleTyping}
              onVotePoll={handleVotePoll}
              onCreatePoll={handleCreatePoll}
            />
          )}

          {activeTab === 'polls' && (
            <PollsView
              polls={polls}
              currentStudentName={currentStudentName}
              onVote={handleVotePoll}
              onCreatePoll={handleCreatePoll}
            />
          )}

          {activeTab === 'exams' && (
            <ExamDifficultyView
              currentStudentName={currentStudentName}
              socket={getSocket()}
            />
          )}

          {activeTab === 'analytics' && (
            <StudyAnalyticsView
              currentStudentName={currentStudentName}
              socket={getSocket()}
            />
          )}

          {activeTab === 'notes' && (
            <NotesEditor
              notes={notes}
              currentStudentName={currentStudentName}
              isDarkMode={isDarkMode}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'files' && (
            <FilesManager
              files={files}
              currentStudentName={currentStudentName}
              isDarkMode={isDarkMode}
              onUploadFile={handleUploadFile}
              onDeleteFile={handleDeleteFile}
            />
          )}

          {activeTab === 'tasks' && (
            <KanbanBoard
              tasks={tasks}
              currentStudentName={currentStudentName}
              members={members}
              isDarkMode={isDarkMode}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === 'whiteboard' && (
            <SharedWhiteboard
              roomId={currentRoomData?.id || room?.id}
              studentName={currentStudentName}
              initialStrokes={whiteboardStrokes}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Study Call Room: Mounted persistently while activeTab is 'call' OR while student is connected in background call */}
          {(activeTab === 'call' || isCallActive || callInfo.inCall) && (
            <div
              className={
                activeTab === 'call'
                  ? 'flex-1 flex flex-col h-full min-h-0'
                  : 'fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden'
              }
            >
              <StudyCallRoom
                ref={callRoomRef}
                roomCode={currentRoomData?.id || room?.id || ''}
                roomTitle={currentRoomData?.name || room?.name || 'Study Room'}
                studentId={sessionId || 'stu_local'}
                studentName={currentStudentName || 'Student'}
                onLeaveCall={handleLeaveCall}
                onCallStateChange={handleCallStateChange}
                onCallInfoChange={(info) => {
                  setCallInfo(info);
                  if (info.inCall) setIsCallActive(true);
                }}
              />
            </div>
          )}

          {activeTab === 'timetable' && (
            <TimetableManager
              entries={timetables}
              currentStudentName={currentStudentName}
              isDarkMode={isDarkMode}
              onCreateEntry={handleCreateTimetable}
              onUpdateEntry={handleUpdateTimetable}
              onDeleteEntry={handleDeleteTimetable}
            />
          )}
        </main>
      </div>

      {/* User Status Picker Modal */}
      <StatusPickerModal
        isOpen={isStatusPickerOpen}
        onClose={() => setIsStatusPickerOpen(false)}
        currentStatus={currentUserStatus}
        currentStudentName={currentStudentName}
        onSaveStatus={handleUpdateStatus}
      />

      {/* Focus Sounds & Ambience Modal */}
      <FocusSoundsModal
        isOpen={isFocusSoundsOpen}
        onClose={() => setIsFocusSoundsOpen(false)}
      />

      {/* App Settings Modal */}
      <AppSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onOpenFocusSounds={() => setIsFocusSoundsOpen(true)}
      />

      {/* Floating Call Miniplayer Bar (Active in Background while navigating Messages, Notes, Files, Goals, Whiteboard, etc.) */}
      {activeTab !== 'call' && (isCallActive || callInfo.inCall) && (
        <FloatingCallBar
          roomTitle={currentRoomData?.name || room?.name || 'Study Room'}
          callInfo={callInfo}
          onToggleMic={() => callRoomRef.current?.toggleMic()}
          onToggleCam={() => callRoomRef.current?.toggleCam()}
          onReturnToCall={() => setActiveTab('call')}
          onLeaveCall={() => {
            callRoomRef.current?.leaveCall();
            handleLeaveCall();
          }}
        />
      )}

      {/* Floating Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 pointer-events-auto"
            >
              <div
                className={`p-1.5 rounded-lg flex-shrink-0 ${
                  toast.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                    : toast.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                    : 'bg-blue-50 dark:bg-blue-950 text-blue-600'
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : toast.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
