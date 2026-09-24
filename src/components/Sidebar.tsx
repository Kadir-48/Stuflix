import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  LogOut,
  Search,
  Plus,
  LogIn,
  Hash,
  Lock,
  Unlock,
  Shield,
  Crown,
  Video,
  Monitor,
  UserX,
  Key,
  Check,
  X,
  AlertTriangle,
  Trash2,
  Users,
  Sun,
  Moon,
  Headphones,
  Settings,
} from 'lucide-react';
import { Room, RoomMember, UserStatus } from '../types';
import { RoomAvatar } from './room/RoomAvatar';
import { UserStatusBadge } from './status/UserStatusBadge';
import { useFocusSounds } from '../context/FocusSoundsContext';

interface SidebarProps {
  rooms: Room[];
  currentRoom: Room;
  currentStudentName: string;
  members: RoomMember[];
  isDarkMode?: boolean;
  currentUserStatus?: UserStatus;
  onOpenStatusPicker?: () => void;
  onOpenFocusSounds?: () => void;
  onOpenSettings?: () => void;
  onToggleDarkMode?: () => void;
  onSelectRoom: (room: Room) => void;
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onLeaveApp?: () => void;
  onLogout?: () => void;
  onOpenLeaveRoom?: () => void;
  onToggleLockRoom?: (isLocked: boolean) => void;
  onChangePassword?: (newPassword: string) => void;
  onRemoveMember?: (sessionId: string) => void;
  onTransferOwnership?: (newOwnerName: string) => void;
  onDeleteRoom?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rooms,
  currentRoom,
  currentStudentName,
  members,
  isDarkMode,
  currentUserStatus,
  onOpenStatusPicker,
  onOpenFocusSounds,
  onOpenSettings,
  onToggleDarkMode,
  onSelectRoom,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onLeaveApp,
  onLogout,
  onOpenLeaveRoom,
  onToggleLockRoom,
  onChangePassword,
  onRemoveMember,
  onDeleteRoom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isHostMenuOpen, setIsHostMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<RoomMember | null>(null);

  const { isPlaying, activeTracks } = useFocusSounds();

  const isHost = currentRoom.ownerName === currentStudentName;

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.studentName === currentStudentName) return -1;
      if (b.studentName === currentStudentName) return 1;
      const aOnline = a.status?.presence !== 'offline';
      const bOnline = b.status?.presence !== 'offline';
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [members, currentStudentName]);

  const onlineMembersCount = useMemo(() => {
    return members.filter((m) => m.studentName === currentStudentName || m.status?.presence !== 'offline').length;
  }, [members, currentStudentName]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !onChangePassword) return;
    onChangePassword(newPassword.trim());
    setPasswordUpdated(true);
    setTimeout(() => {
      setPasswordUpdated(false);
      setNewPassword('');
    }, 2000);
  };

  return (
    <aside className="w-64 h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col select-none flex-shrink-0 transition-colors duration-150">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/80 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
            Stuflix
          </span>
        </div>
        <button
          onClick={onLogout || onLeaveApp}
          title={onLogout ? 'Logout' : 'Exit to home'}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search & Actions */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study rooms..."
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onOpenCreateRoom}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>Create</span>
          </button>
          <button
            onClick={onOpenJoinRoom}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <LogIn className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span>Join</span>
          </button>
        </div>
      </div>

      {/* Joined Rooms List */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex-1 min-h-[140px] max-h-[38%] flex flex-col">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Joined Rooms ({filteredRooms.length})
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              {searchQuery ? 'No rooms match your search' : 'No rooms joined yet'}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.id === currentRoom.id;
              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RoomAvatar
                      color={room.avatarColor || 'blue'}
                      icon={room.avatarIcon || 'book'}
                      size="xs"
                    />
                    <span className="truncate">{room.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {room.isLocked && (
                      <Lock
                        className={`w-3 h-3 ${isActive ? 'text-blue-200' : 'text-amber-500'}`}
                      />
                    )}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Online Active Members List */}
      <div className="flex-1 flex flex-col min-h-0 p-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Members ({onlineMembersCount} active · {members.length} total)
            </span>
          </div>
          {isHost && (
            <button
              onClick={() => setIsHostMenuOpen(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 text-[10px] font-medium transition cursor-pointer"
            >
              <Shield className="w-2.5 h-2.5" />
              <span>Host Menu</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {sortedMembers.map((member) => {
            const isMe = member.studentName === currentStudentName;
            const isOwner =
              member.studentName === currentRoom.ownerName || member.isHost;
            const isOnline =
              isMe || (member.status?.presence ? member.status.presence !== 'offline' : Boolean(member.socketId));

            return (
              <div
                key={member.sessionId || member.socketId || member.studentName}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition ${
                  !isOnline ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-[10px]">
                      {member.studentName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                        isOnline
                          ? member.inCall
                            ? 'bg-purple-500'
                            : 'bg-emerald-500'
                          : 'bg-slate-400 dark:bg-slate-600'
                      } ring-2 ring-white dark:ring-slate-900`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                        {member.studentName}
                      </span>
                      {isMe && <span className="text-[10px] text-slate-400">(You)</span>}
                      {isOwner && (
                        <span title="Room Host">
                          <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        </span>
                      )}
                    </div>

                    {/* Dual-Layer User Status display */}
                    <div className="mt-0.5">
                      <UserStatusBadge
                        status={
                          isMe && currentUserStatus
                            ? currentUserStatus
                            : member.status || {
                                presence: isOnline ? (member.inCall ? 'in_call' : 'online') : 'offline',
                                activity: isOnline ? '📚 Studying' : 'Offline',
                              }
                        }
                        size="xs"
                        onClick={isMe && onOpenStatusPicker ? onOpenStatusPicker : undefined}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] mt-0.5">
                      {member.inCall && (
                        <span className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-medium">
                          <Video className="w-2.5 h-2.5" />
                          <span>In Call</span>
                        </span>
                      )}
                      {member.isScreenSharing && (
                        <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">
                          <Monitor className="w-2.5 h-2.5" />
                          <span>Screen</span>
                        </span>
                      )}
                      {member.isTyping && (
                        <span className="text-slate-400 italic animate-pulse">
                          Typing...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isHost && !isMe && (
                  <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setMemberToRemove(member)}
                      title={`Remove ${member.studentName} from room`}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <UserX className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
              {currentStudentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-xs truncate leading-tight flex items-center gap-1">
                <span>{currentStudentName}</span>
                {isHost && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <Key className="w-2.5 h-2.5 text-slate-400" />
                <span className="truncate font-mono select-all">{currentRoom.password}</span>
              </div>
            </div>
          </div>
          {currentRoom.isLocked && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              <span>Locked</span>
            </span>
          )}
        </div>

        {/* User Status Bar in Bottom Profile */}
        <div className="flex items-center justify-between bg-slate-100/70 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
          <UserStatusBadge
            status={currentUserStatus}
            size="xs"
            onClick={onOpenStatusPicker}
          />
          {onOpenStatusPicker && (
            <button
              onClick={onOpenStatusPicker}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1 flex-shrink-0 cursor-pointer"
            >
              Change
            </button>
          )}
        </div>

        {onOpenLeaveRoom && (
          <button
            onClick={onOpenLeaveRoom}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Room</span>
          </button>
        )}
      </div>

      {/* Host Controls Modal */}
      {isHostMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Host Controls
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Manage security and participants for #{currentRoom.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHostMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Lock / Unlock */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {currentRoom.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>{currentRoom.isLocked ? 'Room is Locked' : 'Room is Unlocked'}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentRoom.isLocked
                      ? 'No new students can enter with the room password.'
                      : 'Students with the room password can freely enter.'}
                  </p>
                </div>
                <button
                  onClick={() => onToggleLockRoom && onToggleLockRoom(!currentRoom.isLocked)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    currentRoom.isLocked
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {currentRoom.isLocked ? 'Unlock Room' : 'Lock Room'}
                </button>
              </div>

              {/* Change Password */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Change Room Password
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Passwords never expire and remain permanently valid until you update them.
                  </p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New unique password"
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={!newPassword.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    {passwordUpdated ? <Check className="w-3 h-3 text-white" /> : <span>Update</span>}
                  </button>
                </form>
                {passwordUpdated && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Password updated successfully!
                  </p>
                )}
              </div>

              {/* Danger Zone: Delete Room */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Delete Room
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Permanently close room and remove all notes & files.
                  </p>
                </div>
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setIsHostMenuOpen(false);
                        onDeleteRoom && onDeleteRoom();
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium shadow-xs cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3 py-1.5 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Utility Bar: Focus Sounds, Theme Toggle, Settings */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-1">
        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer text-[11px] font-medium shadow-2xs"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>☀️ Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span>🌙 Dark Mode</span>
              </>
            )}
          </button>
        )}

        {onOpenFocusSounds && (
          <button
            type="button"
            onClick={onOpenFocusSounds}
            className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] font-medium ${
              isPlaying
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
            title="Focus Sounds & Study Ambience"
          >
            <Headphones className="w-3.5 h-3.5" />
            {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="App Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Current User Status & Profile Bar */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex items-center justify-between">
        <div
          onClick={onOpenStatusPicker}
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition p-1 rounded-lg"
          title="Click to change your study activity status"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
            {currentStudentName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {currentStudentName}
            </p>
            <UserStatusBadge
              status={currentUserStatus || { presence: 'online', activity: '📚 Studying' }}
              size="xs"
            />
          </div>
        </div>

        {onOpenStatusPicker && (
          <button
            type="button"
            onClick={onOpenStatusPicker}
            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer text-[10px] font-semibold flex-shrink-0"
            title="Set study status"
          >
            Edit
          </button>
        )}
      </div>

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Remove {memberToRemove.studentName}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove this student from the study room?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onRemoveMember && memberToRemove.sessionId) {
                    onRemoveMember(memberToRemove.sessionId);
                  }
                  setMemberToRemove(null);
                }}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-xs cursor-pointer"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
