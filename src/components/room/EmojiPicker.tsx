import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Sparkles, X } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
  position?: 'top' | 'bottom';
}

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: { emoji: string; keywords: string[] }[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Reactions',
    icon: '🔥',
    emojis: [
      { emoji: '👍', keywords: ['thumbs up', 'like', 'approve', 'yes'] },
      { emoji: '👎', keywords: ['thumbs down', 'dislike', 'no'] },
      { emoji: '❤️', keywords: ['heart', 'love'] },
      { emoji: '🔥', keywords: ['fire', 'lit', 'hot'] },
      { emoji: '👏', keywords: ['clap', 'applause', 'bravo'] },
      { emoji: '🎉', keywords: ['party', 'celebrate', 'tada'] },
      { emoji: '💯', keywords: ['100', 'perfect', 'score'] },
      { emoji: '🚀', keywords: ['rocket', 'launch', 'fast'] },
      { emoji: '⭐', keywords: ['star', 'favorite'] },
      { emoji: '💡', keywords: ['idea', 'lightbulb', 'solution'] },
      { emoji: '🎯', keywords: ['target', 'bullseye', 'goal'] },
      { emoji: '✨', keywords: ['sparkles', 'magic', 'shine'] },
    ],
  },
  {
    name: 'Study & School',
    icon: '📚',
    emojis: [
      { emoji: '📚', keywords: ['books', 'study', 'reading', 'homework'] },
      { emoji: '📖', keywords: ['open book', 'reading'] },
      { emoji: '✏️', keywords: ['pencil', 'write', 'draw'] },
      { emoji: '📝', keywords: ['memo', 'note', 'document'] },
      { emoji: '📐', keywords: ['triangle ruler', 'geometry', 'math'] },
      { emoji: '📏', keywords: ['straight ruler', 'measure', 'math'] },
      { emoji: '🔬', keywords: ['microscope', 'science', 'biology'] },
      { emoji: '🔭', keywords: ['telescope', 'astronomy', 'physics'] },
      { emoji: '🎓', keywords: ['graduation', 'cap', 'school', 'university'] },
      { emoji: '💻', keywords: ['laptop', 'computer', 'code'] },
      { emoji: '🧠', keywords: ['brain', 'thinking', 'smart'] },
      { emoji: '☕', keywords: ['coffee', 'caffeine', 'energy'] },
      { emoji: '🕒', keywords: ['clock', 'time', 'deadline'] },
      { emoji: '📊', keywords: ['chart', 'graph', 'data'] },
    ],
  },
  {
    name: 'Smiles & Faces',
    icon: '😊',
    emojis: [
      { emoji: '😂', keywords: ['laugh', 'joy', 'lol'] },
      { emoji: '🤣', keywords: ['rofl', 'laughing'] },
      { emoji: '😊', keywords: ['smile', 'happy'] },
      { emoji: '🤓', keywords: ['nerd', 'geek', 'studious'] },
      { emoji: '🤔', keywords: ['thinking', 'hmm', 'curious'] },
      { emoji: '🧐', keywords: ['monocle', 'inspect', 'curious'] },
      { emoji: '🤩', keywords: ['star eyes', 'excited'] },
      { emoji: '😎', keywords: ['cool', 'sunglasses'] },
      { emoji: '🥳', keywords: ['party face', 'celebration'] },
      { emoji: '😇', keywords: ['angel', 'innocent'] },
      { emoji: '😅', keywords: ['sweat smile', 'relief'] },
      { emoji: '😴', keywords: ['sleepy', 'tired', 'zzz'] },
      { emoji: '🤯', keywords: ['mind blown', 'shocked'] },
      { emoji: '😭', keywords: ['crying', 'sad', 'tears'] },
    ],
  },
  {
    name: 'Markers & Symbols',
    icon: '✅',
    emojis: [
      { emoji: '✅', keywords: ['check mark', 'correct', 'done'] },
      { emoji: '❌', keywords: ['cross', 'wrong', 'no'] },
      { emoji: '❓', keywords: ['question', 'help', 'confused'] },
      { emoji: '❗', keywords: ['exclamation', 'alert', 'important'] },
      { emoji: '⚠️', keywords: ['warning', 'caution'] },
      { emoji: '💬', keywords: ['speech bubble', 'chat'] },
      { emoji: '📌', keywords: ['pin', 'pinned'] },
      { emoji: '🏆', keywords: ['trophy', 'winner', 'rank'] },
      { emoji: '🥇', keywords: ['gold medal', 'first'] },
      { emoji: '⏳', keywords: ['hourglass', 'waiting', 'timer'] },
      { emoji: '🔔', keywords: ['bell', 'notification'] },
      { emoji: '🙌', keywords: ['raised hands', 'praise'] },
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
  align = 'left',
  position = 'top',
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Click outside to dismiss
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [onClose]);

  // Filtered emojis
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;

    const results: string[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.emoji.includes(query) ||
          item.keywords.some((k) => k.includes(query))
        ) {
          if (!results.includes(item.emoji)) results.push(item.emoji);
        }
      }
    }
    return results;
  }, [searchQuery]);

  return (
    <div
      ref={pickerRef}
      id="chat-emoji-picker-dropdown"
      className={`absolute z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-3 animate-in fade-in zoom-in-95 ${
        align === 'right' ? 'right-0' : 'left-0'
      } ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
    >
      {/* Header & Search */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative flex-1 mr-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji (e.g. math, fire)..."
            className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs (if not searching) */}
      {!filteredEmojis && (
        <div className="flex items-center gap-1 mb-2 pb-1 overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === idx
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="text-[11px]">{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="max-h-48 overflow-y-auto pr-1">
        {filteredEmojis ? (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
              Search Results ({filteredEmojis.length})
            </div>
            {filteredEmojis.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching emojis found
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelectEmoji(emoji);
                      onClose();
                    }}
                    className="p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition transform hover:scale-120 cursor-pointer flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1">
            {EMOJI_CATEGORIES[activeTab].emojis.map((item) => (
              <button
                key={item.emoji}
                type="button"
                onClick={() => {
                  onSelectEmoji(item.emoji);
                  onClose();
                }}
                title={item.keywords[0]}
                className="p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition transform hover:scale-120 cursor-pointer flex items-center justify-center"
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
