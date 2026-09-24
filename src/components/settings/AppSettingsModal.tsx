import React from 'react';
import {
  X,
  Sun,
  Moon,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  Settings,
  Check,
  Headphones,
} from 'lucide-react';
import { useFocusSounds } from '../../context/FocusSoundsContext';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenFocusSounds?: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onOpenFocusSounds,
}) => {
  const { settings, updateSettings, playChime } = useFocusSounds();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Application Settings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Theme preferences and sound notifications
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

        {/* Settings Body */}
        <div className="p-5 space-y-5">
          {/* 1. Theme Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Appearance & Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDarkMode) onToggleDarkMode();
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  !isDarkMode
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>☀️ Light Mode</span>
                {!isDarkMode && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isDarkMode) onToggleDarkMode();
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-blue-950/60 border-blue-500 text-blue-400 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <Moon className="w-4 h-4 text-blue-400" />
                <span>🌙 Dark Mode</span>
                {isDarkMode && <Check className="w-3.5 h-3.5 text-blue-400 ml-auto" />}
              </button>
            </div>
          </div>

          {/* 2. Sound Notifications */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Sound Notifications & Chimes
            </label>

            {/* Sound Notification Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {settings.soundNotificationsEnabled ? (
                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <BellOff className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Sound Notifications
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Play audio cues for app alerts and events
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    soundNotificationsEnabled: !settings.soundNotificationsEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.soundNotificationsEnabled
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.soundNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Pomodoro Timer Chime Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Pomodoro Session Completion Chime
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Play a gentle melodic chime when focus or break time finishes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    timerChimeEnabled: !settings.timerChimeEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.timerChimeEnabled
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.timerChimeEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sound Volume & Test Chime */}
            {settings.soundNotificationsEnabled && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Notification Volume</span>
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {settings.soundEffectsVolume ?? 80}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.soundEffectsVolume ?? 80}
                    onChange={(e) =>
                      updateSettings({ soundEffectsVolume: parseInt(e.target.value, 10) })
                    }
                    className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={playChime}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-900 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Chime</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Focus Ambience Quick Link */}
          {onOpenFocusSounds && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFocusSounds();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 transition cursor-pointer text-xs font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  <span>Open Focus Sounds & Study Ambience</span>
                </div>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
