import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Check,
  Eye,
  Edit3,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Note } from '../../types';

interface NotesEditorProps {
  notes: Note[];
  currentStudentName: string;
  isDarkMode?: boolean;
  onCreateNote: (title: string) => void;
  onUpdateNote: (noteId: string, updates: { title?: string; content?: string }) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  notes,
  currentStudentName,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarkdownPreview, setIsMarkdownPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Active note state
  const activeNote = notes.find((n) => n.id === selectedNoteId) || (notes.length > 0 ? notes[0] : null);
  const [localTitle, setLocalTitle] = useState(activeNote?.title || '');
  const [localContent, setLocalContent] = useState(activeNote?.content || '');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when activeNote changes
  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title);
      setLocalContent(activeNote.content);
    }
  }, [activeNote?.id]);

  const handleTitleChange = (newTitle: string) => {
    setLocalTitle(newTitle);
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (activeNote) {
        onUpdateNote(activeNote.id, { title: newTitle, content: localContent });
      }
      setSaveStatus('saved');
    }, 600);
  };

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (activeNote) {
        onUpdateNote(activeNote.id, { title: localTitle, content: newContent });
      }
      setSaveStatus('saved');
    }, 600);
  };

  const handleCreateNewNote = () => {
    const title = `Untitled Note ${notes.length + 1}`;
    onCreateNote(title);
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  return (
    <div className="flex-1 flex h-full bg-white dark:bg-slate-900 overflow-hidden select-none transition-colors duration-150">
      {/* Left Sidebar: Notes list */}
      <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              Collaborative Notes
            </h3>
          </div>
          <button
            onClick={handleCreateNewNote}
            title="Create new note"
            className="p-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2.5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No notes found
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-2.5 rounded-xl cursor-pointer transition text-left ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="font-semibold text-xs truncate">{note.title || 'Untitled Note'}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    <span>{note.updatedAt || 'Recently'}</span>
                    <span className="truncate max-w-[90px]">{note.lastEditedBy}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Editor Area */}
      {activeNote ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
          {/* Editor Header Bar */}
          <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
            <input
              type="text"
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note title..."
              className="font-semibold text-slate-900 dark:text-white text-base bg-transparent border-none focus:outline-none flex-1 mr-4 truncate"
            />

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Save status */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mr-2">
                {saveStatus === 'saving' ? (
                  <span className="animate-pulse text-blue-600 dark:text-blue-400">Saving...</span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              {/* Preview toggle */}
              <button
                onClick={() => setIsMarkdownPreview(!isMarkdownPreview)}
                title={isMarkdownPreview ? 'Switch to edit' : 'Preview markdown'}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isMarkdownPreview
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isMarkdownPreview ? (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </>
                )}
              </button>

              {/* Delete button */}
              <button
                onClick={() => setDeleteCandidateId(activeNote.id)}
                title="Delete note"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isMarkdownPreview ? (
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {localContent || (
                  <span className="italic text-slate-400">No content in this note yet.</span>
                )}
              </div>
            ) : (
              <textarea
                value={localContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start typing your study notes, formulas, questions, or definitions here..."
                className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed placeholder:text-slate-400"
              />
            )}
          </div>

          {/* Footer */}
          <div className="h-8 px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50/40 dark:bg-slate-900/40">
            <span>
              Last edited by <strong className="text-slate-600 dark:text-slate-300">{activeNote.lastEditedBy}</strong> at {activeNote.updatedAt}
            </span>
            <span>{localContent.length} characters</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No note selected
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Create a note to collaborate on exam topics with your study group
          </p>
          <button
            onClick={handleCreateNewNote}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shadow-xs cursor-pointer"
          >
            + Create New Note
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Delete this study note?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This note will be permanently removed for all members in this room.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteCandidateId(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteNote(deleteCandidateId);
                  setDeleteCandidateId(null);
                }}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
