import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Hash,
  Search,
  Lock,
  Copy,
  Check,
  Pin,
  PinOff,
  CornerDownRight,
  Pencil,
  Trash2,
  Paperclip,
  Send,
  Download,
  FileText,
  X,
  ChevronDown,
  Smile,
  BarChart2,
} from 'lucide-react';
import { Room, ChatMessage, Poll, RoomMember } from '../../types';
import { EmojiPicker } from './EmojiPicker';
import { PollCard } from '../polls/PollCard';
import { CreatePollModal } from '../polls/CreatePollModal';
import { UserStatusBadge } from '../status/UserStatusBadge';

interface ChatPanelProps {
  room: Room;
  messages: ChatMessage[];
  currentStudentName: string;
  members?: RoomMember[];
  typingUsers?: string[];
  isDarkMode?: boolean;
  onSendMessage: (payload: {
    content: string;
    replyTo?: { id: string; authorName: string; content: string };
    attachment?: { name: string; type: string; size: string; dataUrl: string };
  }) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onPinMessage: (messageId: string, isPinned: boolean) => void;
  onTyping?: (isTyping: boolean) => void;
  onVotePoll?: (pollId: string, optionId: string) => void;
  onCreatePoll?: (payload: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    isAnonymous: boolean;
  }) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '👏', '💡', '😂', '🎯'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  room,
  messages,
  currentStudentName,
  members = [],
  typingUsers = [],
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onPinMessage,
  onTyping,
  onVotePoll,
  onCreatePoll,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    name: string;
    type: string;
    size: string;
    dataUrl: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isPinnedListOpen, setIsPinnedListOpen] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [isInputEmojiPickerOpen, setIsInputEmojiPickerOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomMarkerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const kind = isImage ? 'image' : isPdf ? 'pdf' : 'doc';

    const reader = new FileReader();
    reader.onload = () => {
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      setSelectedAttachment({
        name: file.name,
        type: kind,
        size: sizeStr,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      bottomMarkerRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollBottom(false);
    } else {
      setShowScrollBottom(true);
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight >= 150);
  };

  const scrollToBottom = () => {
    bottomMarkerRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/40');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/40');
      }, 2000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  // Component Mount/Unmount Diagnostics
  useEffect(() => {
    console.log('[Component mount] ChatPanel mounted for room:', room.id);
    return () => {
      console.log('[Component unmount] ChatPanel unmounted for room:', room.id);
    };
  }, [room.id]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedAttachment) return;

    console.log('[Message send] Sending message in room:', room.id, 'Content:', inputText.trim());

    if (onTyping) {
      onTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }

    onSendMessage({
      content: inputText.trim(),
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            authorName: replyingTo.authorName,
            content:
              replyingTo.content ||
              (replyingTo.attachment ? `[Attachment: ${replyingTo.attachment.name}]` : ''),
          }
        : undefined,
      attachment: selectedAttachment || undefined,
    });

    setInputText('');
    setReplyingTo(null);
    setSelectedAttachment(null);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const kind = isImage ? 'image' : isPdf ? 'pdf' : 'doc';

    const reader = new FileReader();
    reader.onload = () => {
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      setSelectedAttachment({
        name: file.name,
        type: kind,
        size: sizeStr,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(room.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned), [messages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.authorName.toLowerCase().includes(q) ||
        m.attachment?.name.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden select-none transition-colors duration-150 relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/15 backdrop-blur-[2px] border-2 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col items-center gap-2.5 text-center border border-blue-200 dark:border-blue-800">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Paperclip className="w-6 h-6 animate-bounce" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-base">Drop File to Share in Room</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Supports assignment PDFs, textbook screenshots, study notes, and images
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <h2 className="font-semibold text-slate-900 dark:text-white text-base truncate">
            {room.name}
          </h2>
          {room.isLocked && (
            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            title="Search messages"
            className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              isSearchOpen
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyPassword}
            title="Click to copy room password"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Pass: <strong className="text-slate-900 dark:text-white font-mono">{room.password}</strong>
            </span>
            {copiedPassword ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-1" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Search Bar Drawer */}
      {isSearchOpen && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages by keyword, formula, or student name..."
            autoFocus
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          {searchQuery && (
            <span className="text-[11px] text-slate-400">
              {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'}
            </span>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 fill-amber-600" />
            <div className="truncate">
              <span className="font-semibold mr-1">Pinned:</span>
              <button
                onClick={() => scrollToMessage(pinnedMessages[0].id)}
                className="hover:underline text-left truncate inline-block max-w-md font-medium cursor-pointer"
              >
                {pinnedMessages[0].content || pinnedMessages[0].attachment?.name || 'Pinned message'}
              </button>
              {pinnedMessages.length > 1 && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 ml-1 font-semibold">
                  (+{pinnedMessages.length - 1} more)
                </span>
              )}
            </div>
          </div>
          {pinnedMessages.length > 1 && (
            <button
              onClick={() => setIsPinnedListOpen(!isPinnedListOpen)}
              className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-medium cursor-pointer"
            >
              {isPinnedListOpen ? 'Collapse' : 'View All'}
            </button>
          )}
        </div>
      )}

      {isPinnedListOpen && pinnedMessages.length > 1 && (
        <div className="bg-amber-50 dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700 p-3 space-y-2 max-h-40 overflow-y-auto">
          {pinnedMessages.map((m) => (
            <div
              key={m.id}
              onClick={() => scrollToMessage(m.id)}
              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700 text-xs cursor-pointer hover:border-amber-400 transition"
            >
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1">
                  {m.authorName}:
                </span>
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {m.content || m.attachment?.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{m.timestamp}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4 relative"
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
            <p className="text-sm font-medium">
              {searchQuery ? 'No matching messages found' : 'No messages yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'Try a different search query'
                : 'Send a formula or doubt to start studying together'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.authorName === currentStudentName;
            const isEditing = editingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`group relative flex flex-col space-y-1 p-2.5 -mx-2 rounded-xl transition ${
                  msg.isPinned
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-l-2 border-amber-400'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Reply To Preview */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 ml-9 mb-0.5 border-l-2 border-blue-300 dark:border-blue-700 pl-2">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      @{msg.replyTo.authorName}
                    </span>
                    <span className="truncate max-w-xs">{msg.replyTo.content}</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Author Avatar */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-xs flex-shrink-0">
                    {msg.authorName.charAt(0).toUpperCase()}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-xs">
                        {msg.authorName}
                      </span>
                      {(() => {
                        const authorMember = members.find(
                          (m) => m.studentName.toLowerCase() === msg.authorName.toLowerCase()
                        );
                        if (authorMember?.status) {
                          return <UserStatusBadge status={authorMember.status} size="xs" />;
                        }
                        return null;
                      })()}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {msg.timestamp}
                      </span>
                      {msg.edited && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                          (edited)
                        </span>
                      )}
                      {msg.isPinned && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <Pin className="w-2.5 h-2.5 fill-amber-600" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onEditMessage(msg.id, editContent);
                              setEditingMessageId(null);
                            }
                            if (e.key === 'Escape') setEditingMessageId(null);
                          }}
                        />
                        <button
                          onClick={() => {
                            onEditMessage(msg.id, editContent);
                            setEditingMessageId(null);
                          }}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-xs font-medium cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {msg.content && (
                          <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 whitespace-pre-wrap break-words leading-relaxed select-text">
                            {msg.content}
                          </p>
                        )}

                        {msg.attachment && (
                          <div className="mt-2">
                            {msg.attachment.type === 'image' ? (
                              <img
                                src={msg.attachment.dataUrl}
                                alt={msg.attachment.name}
                                className="max-w-xs max-h-64 rounded-xl border border-slate-200 dark:border-slate-700 object-cover cursor-pointer hover:opacity-95 transition"
                                onClick={() => window.open(msg.attachment?.dataUrl, '_blank')}
                              />
                            ) : (
                              <a
                                href={msg.attachment.dataUrl}
                                download={msg.attachment.name}
                                className="inline-flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs transition"
                              >
                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {msg.attachment.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{msg.attachment.size}</p>
                                </div>
                                <Download className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white ml-1" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* WhatsApp-Style Embedded Poll Card */}
                        {msg.poll && (
                          <div className="mt-2.5 w-full max-w-md">
                            <PollCard
                              poll={msg.poll}
                              currentStudentName={currentStudentName}
                              onVote={(optId) => onVotePoll && onVotePoll(msg.poll!.id, optId)}
                              isCompact
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(msg.reactions).map(([emoji, users]) => {
                          const hasReacted = users.includes(currentStudentName);
                          return (
                            <button
                              key={emoji}
                              onClick={() => onToggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition cursor-pointer ${
                                hasReacted
                                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-semibold">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Action Bar */}
                <div
                  className={`absolute right-2 top-2 ${
                    reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'
                  } items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs px-1 py-0.5 z-10`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onToggleReaction(msg.id, emoji)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs transition cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Open full emoji picker for this message */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setReactionPickerMessageId(
                          reactionPickerMessageId === msg.id ? null : msg.id
                        )
                      }
                      title="More reactions"
                      className={`p-1 rounded text-xs transition cursor-pointer ${
                        reactionPickerMessageId === msg.id
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {reactionPickerMessageId === msg.id && (
                      <EmojiPicker
                        align="right"
                        position="top"
                        onSelectEmoji={(emoji) => {
                          onToggleReaction(msg.id, emoji);
                          setReactionPickerMessageId(null);
                        }}
                        onClose={() => setReactionPickerMessageId(null)}
                      />
                    )}
                  </div>

                  <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                  <button
                    onClick={() => onPinMessage(msg.id, !msg.isPinned)}
                    title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                    className={`p-1 rounded transition cursor-pointer ${
                      msg.isPinned
                        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {msg.isPinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setReplyingTo(msg)}
                    title="Reply"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                  </button>
                  {isMe && (
                    <button
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setEditContent(msg.content);
                      }}
                      title="Edit"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isMe && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      title="Delete"
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomMarkerRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg text-xs font-medium cursor-pointer transition"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>New messages below</span>
        </button>
      )}

      {/* Bottom Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Reply preview */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>
                Replying to{' '}
                <strong className="text-slate-800 dark:text-white">
                  @{replyingTo.authorName}
                </strong>
                :
              </span>
              <span className="truncate italic">
                {replyingTo.content || 'attachment'}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected attachment preview */}
        {selectedAttachment && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-lg text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {selectedAttachment.name}
              </span>
              <span className="text-[10px] text-slate-500">({selectedAttachment.size})</span>
            </div>
            <button
              onClick={() => setSelectedAttachment(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 italic pb-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          {isInputEmojiPickerOpen && (
            <EmojiPicker
              align="left"
              position="top"
              onSelectEmoji={(emoji) => {
                setInputText((prev) => prev + emoji);
              }}
              onClose={() => setIsInputEmojiPickerOpen(false)}
            />
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAttachmentUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach past paper or question image"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="chat-input-emoji-toggle-btn"
            onClick={() => setIsInputEmojiPickerOpen(!isInputEmojiPickerOpen)}
            title="Insert emoji into message"
            className={`p-2 rounded-xl transition cursor-pointer ${
              isInputEmojiPickerOpen
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Smile className="w-4 h-4" />
          </button>
          {onCreatePoll && (
            <button
              type="button"
              onClick={() => setIsCreatePollOpen(true)}
              title="Create WhatsApp-style poll"
              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          )}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message #${room.name}...`}
            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={!inputText.trim() && !selectedAttachment}
            className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {onCreatePoll && (
        <CreatePollModal
          isOpen={isCreatePollOpen}
          onClose={() => setIsCreatePollOpen(false)}
          onCreatePoll={onCreatePoll}
        />
      )}
    </div>
  );
};
