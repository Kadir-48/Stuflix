import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  LogIn,
  Sun,
  Moon,
  Key,
  X,
  Users,
  Sparkles,
  Headphones,
  Settings,
} from 'lucide-react';
import { Room } from './types';
import { RoomView } from './components/RoomView';
import { Clock } from './components/Clock';
import { PomodoroTimer } from './components/PomodoroTimer';
import { RoomAvatar, ROOM_AVATAR_COLORS, ROOM_AVATAR_ICONS } from './components/room/RoomAvatar';
import { FocusSoundsProvider, useFocusSounds } from './context/FocusSoundsContext';
import { FocusSoundsModal } from './components/sounds/FocusSoundsModal';
import { AppSettingsModal } from './components/settings/AppSettingsModal';
import { getSocket } from './lib/socket';
import { safeFetchJson } from './lib/api';

function StuflixApp() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('stuflix_dark_mode') || localStorage.getItem('studyhub_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const { isPlaying } = useFocusSounds();
  const [isFocusSoundsOpen, setIsFocusSoundsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [sessionId] = useState<string>(() => {
    let id = localStorage.getItem('stuflix_session_id') || localStorage.getItem('studyhub_session_id');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('stuflix_session_id', id);
    }
    return id;
  });

  const [currentStudentName, setCurrentStudentName] = useState<string>(() => {
    return localStorage.getItem('stuflix_student_name') || localStorage.getItem('studyhub_student_name') || '';
  });

  const [recentRooms, setRecentRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem('stuflix_my_rooms') || localStorage.getItem('studyhub_my_rooms');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentRoom, setCurrentRoom] = useState<Room | null>(() => {
    try {
      const activeId = localStorage.getItem('stuflix_active_room_id');
      if (activeId) {
        const saved = localStorage.getItem('stuflix_my_rooms') || localStorage.getItem('studyhub_my_rooms');
        if (saved) {
          const list: Room[] = JSON.parse(saved);
          const found = list.find((r: Room) => r.id === activeId);
          if (found) return found;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Verify and refresh active room data from database on mount / refresh
  useEffect(() => {
    if (currentRoom?.id) {
      safeFetchJson<{ room?: Room; error?: string }>(`/api/rooms/${currentRoom.id}`).then((res) => {
        if (res.ok && res.data?.room) {
          setCurrentRoom(res.data.room);
          setRecentRooms((prev) => {
            const updated = prev.map((r) => (r.id === res.data!.room!.id ? res.data!.room! : r));
            localStorage.setItem('stuflix_my_rooms', JSON.stringify(updated));
            return updated;
          });
        }
      });
    }
  }, []);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [createRoomPassword, setCreateRoomPassword] = useState('');
  const [createStudentName, setCreateStudentName] = useState(currentStudentName);
  const [createRoomAvatarColor, setCreateRoomAvatarColor] = useState('blue');
  const [createRoomAvatarIcon, setCreateRoomAvatarIcon] = useState('book');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Real-time active student counts per room
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinStudentName, setJoinStudentName] = useState(currentStudentName);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [rejoiningId, setRejoiningId] = useState<string | null>(null);

  // Real-time active student counts socket listener & polling
  useEffect(() => {
    const socket = getSocket();
    const handleRoomCounts = (counts: Record<string, number>) => {
      if (counts && typeof counts === 'object') {
        setActiveCounts((prev) => ({ ...prev, ...counts }));
      }
    };

    socket.on('room_counts_updated', handleRoomCounts);

    // Initial fetch of active counts
    safeFetchJson<{ counts: Record<string, number> }>('/api/rooms/active-counts').then((res) => {
      if (res.ok && res.data?.counts) {
        setActiveCounts(res.data.counts);
      }
    });

    const interval = setInterval(() => {
      safeFetchJson<{ counts: Record<string, number> }>('/api/rooms/active-counts').then((res) => {
        if (res.ok && res.data?.counts) {
          setActiveCounts((prev) => ({ ...prev, ...res.data!.counts }));
        }
      });
    }, 15000);

    return () => {
      socket.off('room_counts_updated', handleRoomCounts);
      clearInterval(interval);
    };
  }, []);

  // Sync dark mode class & persistence
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('stuflix_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Browser back/forward navigation support
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.inRoom) {
        setCurrentRoom(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleRoomEntered = (room: Room, studentName: string) => {
    setCurrentStudentName(studentName);
    localStorage.setItem('stuflix_student_name', studentName);
    localStorage.setItem('stuflix_active_room_id', room.id);

    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => r.id !== room.id);
      const updated = [room, ...filtered];
      localStorage.setItem('stuflix_my_rooms', JSON.stringify(updated));
      return updated;
    });

    // Update browser history so Back button gracefully returns to Room List
    try {
      window.history.pushState({ inRoom: true, roomId: room.id }, '', window.location.pathname);
    } catch {
      // safe fallback if sandbox limits pushState
    }

    setCurrentRoom(room);
    setIsCreateOpen(false);
    setIsJoinOpen(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomName.trim() || !createRoomPassword.trim() || !createStudentName.trim()) {
      return;
    }
    setCreateError('');
    setIsCreating(true);

    try {
      const result = await safeFetchJson<{ success: boolean; room: Room; error?: string }>(
        '/api/rooms/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: createRoomName.trim(),
            password: createRoomPassword.trim(),
            creatorName: createStudentName.trim(),
            sessionId,
            avatarColor: createRoomAvatarColor,
            avatarIcon: createRoomAvatarIcon,
          }),
        }
      );

      if (!result.ok || !result.data?.success || !result.data?.room) {
        setCreateError(result.error || result.data?.error || 'Failed to create room');
        setIsCreating(false);
        return;
      }
      handleRoomEntered(result.data.room, createStudentName.trim());
    } catch {
      setCreateError('Connection error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPassword.trim() || !joinStudentName.trim()) {
      return;
    }
    setJoinError('');
    setIsJoining(true);

    try {
      const result = await safeFetchJson<{ success: boolean; room: Room; error?: string }>(
        '/api/rooms/join',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: joinPassword.trim(),
            studentName: joinStudentName.trim(),
            sessionId,
          }),
        }
      );

      if (!result.ok || !result.data?.success || !result.data?.room) {
        setJoinError(result.error || result.data?.error || 'Failed to join room');
        setIsJoining(false);
        return;
      }
      handleRoomEntered(result.data.room, joinStudentName.trim());
    } catch {
      setJoinError('Connection error. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRejoinRoom = async (room: Room) => {
    const studentName = currentStudentName || 'Student';
    setRejoiningId(room.id);

    try {
      const result = await safeFetchJson<{ success: boolean; room: Room; error?: string }>(
        '/api/rooms/rejoin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            password: room.password,
            studentName,
            sessionId,
          }),
        }
      );

      if (result.ok && result.data?.success && result.data?.room) {
        handleRoomEntered(result.data.room, studentName);
      } else {
        // Prompt join modal with prefilled password
        setJoinPassword(room.password || '');
        setJoinStudentName(currentStudentName);
        setIsJoinOpen(true);
      }
    } catch {
      setJoinPassword(room.password || '');
      setJoinStudentName(currentStudentName);
      setIsJoinOpen(true);
    } finally {
      setRejoiningId(null);
    }
  };

  const handleLeaveRoom = (deletedRoomId?: string) => {
    localStorage.removeItem('stuflix_active_room_id');
    if (typeof deletedRoomId === 'string' && deletedRoomId) {
      setRecentRooms((prev) => {
        const filtered = prev.filter((r) => r.id !== deletedRoomId);
        localStorage.setItem('stuflix_my_rooms', JSON.stringify(filtered));
        return filtered;
      });
    }
    setCurrentRoom(null);
    try {
      if (window.history.state?.inRoom) {
        window.history.back();
      }
    } catch {
      // safe fallback
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('stuflix_active_room_id');
    setCurrentRoom(null);
    setCurrentStudentName('');
    setRecentRooms([]);
    localStorage.removeItem('stuflix_student_name');
    localStorage.removeItem('studyhub_student_name');
    localStorage.removeItem('stuflix_my_rooms');
    localStorage.removeItem('studyhub_my_rooms');
    try {
      if (window.history.state?.inRoom) {
        window.history.back();
      }
    } catch {
      // safe fallback
    }
  };

  // If in a room, render the RoomView
  if (currentRoom) {
    return (
      <RoomView
        room={currentRoom}
        joinedRooms={recentRooms}
        currentStudentName={currentStudentName}
        sessionId={sessionId}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onSelectRoom={(r) => {
          localStorage.setItem('stuflix_active_room_id', r.id);
          setCurrentRoom(r);
        }}
        onOpenCreateRoom={() => {
          setCreateRoomName('');
          setCreateRoomPassword('');
          setCreateStudentName(currentStudentName);
          setCreateError('');
          setIsCreateOpen(true);
        }}
        onOpenJoinRoom={() => {
          setJoinPassword('');
          setJoinStudentName(currentStudentName);
          setJoinError('');
          setIsJoinOpen(true);
        }}
        onLeaveRoom={handleLeaveRoom}
        onLogout={handleLogout}
      />
    );
  }

  // Otherwise, render the Stuflix Welcome / Landing Screen
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-150 relative select-none">
      {/* Top-Right Theme Toggle, Focus Ambience, Settings & Clock */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Focus Ambience Quick Button */}
        <button
          onClick={() => setIsFocusSoundsOpen(true)}
          title="Focus Sounds & Ambience"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            isPlaying
              ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span className="hidden sm:inline">Ambience</span>
          {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="App Settings & Notifications"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer text-xs font-semibold"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">☀️ Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">🌙 Dark Mode</span>
            </>
          )}
        </button>

        <Clock />
      </div>

      {/* Main Center Card */}
      <div className="flex flex-col items-center text-center space-y-5 max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <BookOpen className="w-8 h-8 text-white stroke-[2.2]" />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stuflix
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal">
            Private study rooms for 10th-grade students
          </p>
        </div>

        <div className="w-full pt-4 space-y-3">
          <button
            id="create-room-btn"
            onClick={() => {
              setCreateError('');
              setCreateStudentName(currentStudentName);
              setIsCreateOpen(true);
            }}
            className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>

          <button
            id="join-room-btn"
            onClick={() => {
              setJoinError('');
              setJoinStudentName(currentStudentName);
              setIsJoinOpen(true);
            }}
            className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Join Room</span>
          </button>
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <div className="w-full pt-5 text-left">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent Rooms ({recentRooms.length})
              </span>
            </div>
            <div className="space-y-2.5">
              {recentRooms.map((r) => {
                const count = activeCounts[r.id] ?? 0;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RoomAvatar
                        color={r.avatarColor || 'blue'}
                        icon={r.avatarIcon || 'book'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {r.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {count > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span>{count} {count === 1 ? 'student active' : 'students active'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-normal bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>0 active now</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRejoinRoom(r)}
                      disabled={rejoiningId === r.id}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/70 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 disabled:opacity-50 transition cursor-pointer"
                    >
                      {rejoiningId === r.id ? 'Rejoining...' : 'Rejoin'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pomodoro Study Timer */}
        <div className="w-full pt-4 text-left">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Study Focus Timer
            </span>
          </div>
          <PomodoroTimer
            studentName={currentStudentName || 'Student'}
            onOpenFocusSounds={() => setIsFocusSoundsOpen(true)}
          />
        </div>
      </div>

      {/* Create Room Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  Create Private Study Room
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Room Name
                </label>
                <input
                  type="text"
                  value={createRoomName}
                  onChange={(e) => {
                    setCreateRoomName(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  placeholder="e.g. Physics Revision 10A"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Room Password
                </label>
                <input
                  type="password"
                  value={createRoomPassword}
                  onChange={(e) => {
                    setCreateRoomPassword(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  placeholder="Set an entry password"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Student Display Name
                </label>
                <input
                  type="text"
                  value={createStudentName}
                  onChange={(e) => {
                    setCreateStudentName(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  placeholder="Your display name"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              {/* Avatar Theme Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Room Avatar Theme
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <RoomAvatar
                    color={createRoomAvatarColor}
                    icon={createRoomAvatarIcon}
                    size="lg"
                  />
                  <div className="space-y-2 flex-1">
                    {/* Color Dots */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ROOM_AVATAR_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCreateRoomAvatarColor(c.id)}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                            c.bgClass
                          } ${
                            createRoomAvatarColor === c.id
                              ? 'ring-2 ring-offset-2 ring-blue-600 scale-110'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>

                    {/* Icon Selection */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ROOM_AVATAR_ICONS.map((ico) => {
                        const IconComponent = ico.icon;
                        return (
                          <button
                            key={ico.id}
                            type="button"
                            onClick={() => setCreateRoomAvatarIcon(ico.id)}
                            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                              createRoomAvatarIcon === ico.id
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={ico.label}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-medium transition cursor-pointer shadow-sm shadow-blue-600/20"
                >
                  {isCreating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {isJoinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  Join Room
                </h3>
              </div>
              <button
                onClick={() => setIsJoinOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Room Password
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => {
                    setJoinPassword(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="Enter room password"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Student Name
                </label>
                <input
                  type="text"
                  value={joinStudentName}
                  onChange={(e) => {
                    setJoinStudentName(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="Your display name"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              {joinError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
                  {joinError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-medium transition cursor-pointer shadow-sm shadow-blue-600/20"
                >
                  {isJoining ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Focus Sounds Modal */}
      <FocusSoundsModal
        isOpen={isFocusSoundsOpen}
        onClose={() => setIsFocusSoundsOpen(false)}
      />

      {/* App Settings Modal */}
      <AppSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenFocusSounds={() => setIsFocusSoundsOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FocusSoundsProvider>
      <StuflixApp />
    </FocusSoundsProvider>
  );
}
