import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings2,
  Check,
  Bell,
  Coffee,
  Brain,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { useFocusSounds } from '../context/FocusSoundsContext';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroTimerProps {
  isDarkMode?: boolean;
  studentName?: string;
  onOpenSoundPicker?: () => void;
  onOpenFocusSounds?: () => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  studentName,
  onOpenSoundPicker,
  onOpenFocusSounds,
}) => {
  const handleOpenSounds = onOpenSoundPicker || onOpenFocusSounds;
  const { playChime, isPlaying, activeTracks, toggleSound, lastPlayedSoundId, getSoundById } = useFocusSounds();

  // Durations in minutes
  const [focusDuration, setFocusDuration] = useState<number>(() => {
    const saved = localStorage.getItem('stuflix_pomo_focus') || localStorage.getItem('studyhub_pomo_focus');
    return saved ? Math.max(1, parseInt(saved, 10)) : 25;
  });
  const [breakDuration, setBreakDuration] = useState<number>(() => {
    const saved = localStorage.getItem('stuflix_pomo_break') || localStorage.getItem('studyhub_pomo_break');
    return saved ? Math.max(1, parseInt(saved, 10)) : 5;
  });
  const [longBreakDuration, setLongBreakDuration] = useState<number>(() => {
    const saved = localStorage.getItem('stuflix_pomo_long_break') || localStorage.getItem('studyhub_pomo_long_break');
    return saved ? Math.max(1, parseInt(saved, 10)) : 15;
  });

  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(focusDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Custom setting draft states
  const [customFocus, setCustomFocus] = useState<number>(focusDuration);
  const [customBreak, setCustomBreak] = useState<number>(breakDuration);
  const [customLongBreak, setCustomLongBreak] = useState<number>(longBreakDuration);

  // Switch mode helper
  const switchMode = (newMode: TimerMode, autoStart = false) => {
    setMode(newMode);
    let durationMinutes = focusDuration;
    if (newMode === 'shortBreak') durationMinutes = breakDuration;
    if (newMode === 'longBreak') durationMinutes = longBreakDuration;

    setTimeLeft(durationMinutes * 60);
    setIsRunning(autoStart);
  };

  // Timer interval effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft <= 0) {
      // Play harmonic chime when timer finishes!
      playChime();

      if (mode === 'focus') {
        const nextSessions = completedSessions + 1;
        setCompletedSessions(nextSessions);
        if (nextSessions % 4 === 0) {
          switchMode('longBreak', false);
        } else {
          switchMode('shortBreak', false);
        }
      } else {
        switchMode('focus', false);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, completedSessions, focusDuration, breakDuration, longBreakDuration, playChime]);

  // Handle saving customized durations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const safeFocus = Math.max(1, Math.min(180, customFocus || 25));
    const safeBreak = Math.max(1, Math.min(60, customBreak || 5));
    const safeLongBreak = Math.max(1, Math.min(90, customLongBreak || 15));

    setFocusDuration(safeFocus);
    setBreakDuration(safeBreak);
    setLongBreakDuration(safeLongBreak);

    localStorage.setItem('stuflix_pomo_focus', safeFocus.toString());
    localStorage.setItem('stuflix_pomo_break', safeBreak.toString());
    localStorage.setItem('stuflix_pomo_long_break', safeLongBreak.toString());

    // Reset current timer to new duration for current mode
    let updatedMinutes = safeFocus;
    if (mode === 'shortBreak') updatedMinutes = safeBreak;
    if (mode === 'longBreak') updatedMinutes = safeLongBreak;
    setTimeLeft(updatedMinutes * 60);
    setIsRunning(false);
    setIsSettingsOpen(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    let mins = focusDuration;
    if (mode === 'shortBreak') mins = breakDuration;
    if (mode === 'longBreak') mins = longBreakDuration;
    setTimeLeft(mins * 60);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      switchMode('shortBreak', false);
    } else {
      switchMode('focus', false);
    }
  };

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress ratio
  const totalSeconds =
    (mode === 'focus' ? focusDuration : mode === 'shortBreak' ? breakDuration : longBreakDuration) * 60;
  const progressPercent =
    totalSeconds > 0 ? Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100)) : 0;

  const currentSound =
    activeTracks.length > 0
      ? getSoundById(activeTracks[0].soundId)
      : lastPlayedSoundId
      ? getSoundById(lastPlayedSoundId)
      : getSoundById('brown_noise');

  return (
    <div
      id="lobby-pomodoro-timer"
      className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs p-4 shadow-sm"
    >
      {/* Top Header: Modes & Settings Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs">
          <button
            type="button"
            onClick={() => switchMode('focus', false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              mode === 'focus'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Focus</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('shortBreak', false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              mode === 'shortBreak'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Break</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('longBreak', false)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
              mode === 'longBreak'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Long</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onOpenSoundPicker && (
            <button
              type="button"
              onClick={onOpenSoundPicker}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isPlaying
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title="Focus Ambience Sounds"
            >
              <Headphones className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setCustomFocus(focusDuration);
              setCustomBreak(breakDuration);
              setCustomLongBreak(longBreakDuration);
              setIsSettingsOpen(!isSettingsOpen);
            }}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isSettingsOpen
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
            title="Customize Pomodoro Durations"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Countdown Display */}
      {!isSettingsOpen ? (
        <div className="flex flex-col items-center justify-center py-2">
          {/* Circular / Linear Progress indicator */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                mode === 'focus'
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : mode === 'shortBreak'
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-purple-600 dark:bg-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div
            id="pomodoro-timer-digits"
            className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white mb-1"
          >
            {formattedTime}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span className="font-medium">
              {mode === 'focus' ? '🎯 Focus Session' : mode === 'shortBreak' ? '☕ Quick Rest' : '🌿 Long Rest'}
            </span>
            <span>•</span>
            <span>{completedSessions} completed</span>
          </div>

          {/* Quick Sound Toggle Pill */}
          {currentSound && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => toggleSound(currentSound.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                  activeTracks.some((t) => t.soundId === currentSound.id)
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
                title="Toggle background focus audio"
              >
                <span>{currentSound.icon}</span>
                <span>{currentSound.title}</span>
                {activeTracks.some((t) => t.soundId === currentSound.id) ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
                ) : (
                  <span className="text-[10px] text-slate-400 ml-0.5">Off</span>
                )}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="pomodoro-toggle-btn"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-white font-medium text-xs sm:text-sm shadow-xs transition cursor-pointer ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700'
                  : mode === 'focus'
                  ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="pomodoro-reset-btn"
              onClick={handleReset}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              id="pomodoro-skip-btn"
              onClick={handleSkip}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              title="Skip to Next Session"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Custom Duration Settings Form */
        <form onSubmit={handleSaveSettings} className="space-y-3 pt-1">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Set Custom Durations (minutes)
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Focus
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={customFocus}
                onChange={(e) => setCustomFocus(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1.5 text-center text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Break
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={customBreak}
                onChange={(e) => setCustomBreak(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1.5 text-center text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Long Break
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={customLongBreak}
                onChange={(e) => setCustomLongBreak(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1.5 text-center text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
