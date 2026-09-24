import React, { useState } from 'react';
import { X, Clock, BookOpen, Check, Target, Sparkles } from 'lucide-react';

interface LogSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSession: (data: {
    durationMinutes: number;
    subject: string;
    focusScore?: number;
    notes?: string;
    soundUsed?: string;
  }) => void;
}

const COMMON_SUBJECTS = [
  'Physics',
  'Mathematics',
  'Chemistry',
  'Computer Science',
  'Biology',
  'General Study',
];

const SOUND_OPTIONS = [
  { id: '', label: 'None (Silence)' },
  { id: 'rain', label: '🌧 Rain' },
  { id: 'heavy_rain', label: '🌧 Heavy Rain' },
  { id: 'thunderstorm', label: '⛈ Thunderstorm' },
  { id: 'forest', label: '🌲 Forest & Birds' },
  { id: 'river', label: '🌊 River Stream' },
  { id: 'ocean_waves', label: '🌊 Ocean Waves' },
  { id: 'coffee_shop', label: '☕ Coffee Shop' },
  { id: 'library', label: '📚 Library Ambience' },
  { id: 'classroom', label: '🏫 Classroom Ambience' },
  { id: 'lofi_beats', label: '🎵 Lo-fi Beats' },
  { id: 'piano_focus', label: '🎹 Piano Focus' },
  { id: 'brown_noise', label: '🧠 Brown Noise' },
  { id: 'white_noise', label: '💨 White Noise' },
  { id: 'pink_noise', label: '🌸 Pink Noise' },
  { id: 'deep_focus', label: '🧘 Deep Focus Noise' },
];

export const LogSessionModal: React.FC<LogSessionModalProps> = ({
  isOpen,
  onClose,
  onLogSession,
}) => {
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [subject, setSubject] = useState<string>(COMMON_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [soundUsed, setSoundUsed] = useState<string>('');
  const [focusScore, setFocusScore] = useState<number>(90);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSubject = subject === 'Other' ? customSubject.trim() : subject;
    onLogSession({
      durationMinutes,
      subject: effectiveSubject || 'General Study',
      focusScore,
      notes: notes.trim() || undefined,
      soundUsed: soundUsed ? soundUsed : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Log Study Session
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Record your offline or self-study focus interval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Duration Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Study Duration (Minutes)
            </label>
            <div className="flex items-center gap-2">
              {[25, 45, 60, 90, 120].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDurationMinutes(mins)}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    durationMinutes === mins
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={5}
                max={600}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 25)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">
                ({(durationMinutes / 60).toFixed(1)} hrs)
              </span>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {COMMON_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="Other">Other...</option>
            </select>
          </div>

          {subject === 'Other' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Custom Subject Name
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="e.g. Economics"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          )}

          {/* Focus Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Focus Quality Score
              </label>
              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                {focusScore}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={focusScore}
              onChange={(e) => setFocusScore(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Focus Sound Used */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Focus Sound / Ambience Used (optional)
            </label>
            <select
              value={soundUsed}
              onChange={(e) => setSoundUsed(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {SOUND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Session Notes / Topics Covered (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Solved past paper 2023 questions 1-10"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
