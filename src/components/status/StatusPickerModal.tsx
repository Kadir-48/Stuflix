import React, { useState } from 'react';
import { X, Check, Sparkles, Radio, Info } from 'lucide-react';
import { UserStatus, PresenceStatus } from '../../types';
import { PRESENCE_CONFIG, ACTIVITY_PRESETS, UserStatusBadge } from './UserStatusBadge';

interface StatusPickerModalProps {
  currentStatus?: UserStatus;
  currentStudentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveStatus: (status: UserStatus) => void;
}

export const StatusPickerModal: React.FC<StatusPickerModalProps> = ({
  currentStatus,
  currentStudentName,
  isOpen,
  onClose,
  onSaveStatus,
}) => {
  const currentPresence: PresenceStatus = currentStatus?.presence || 'online';
  const [selectedActivity, setSelectedActivity] = useState<string>(
    currentStatus?.activity || '📚 Studying'
  );
  const [customText, setCustomText] = useState<string>(
    currentStatus?.customText || ''
  );

  if (!isOpen) return null;

  const handleSelectPreset = (presetText: string) => {
    setSelectedActivity(presetText);
    setCustomText('');
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomText(val);
    if (val.trim()) {
      setSelectedActivity(val.trim());
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalActivity = customText.trim() ? customText.trim() : selectedActivity;
    onSaveStatus({
      presence: currentPresence,
      activity: finalActivity,
      customText: customText.trim() || undefined,
      updatedAt: Date.now(),
    });
    onClose();
  };

  const currentPresenceConfig = PRESENCE_CONFIG[currentPresence] || PRESENCE_CONFIG.online;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Set Study Activity
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose what you're working on for {currentStudentName}
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
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Automatic Presence Status Indicator Banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentPresenceConfig.dotClass} ring-2 ring-white dark:ring-slate-900`} />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Presence: {currentPresenceConfig.label}
                </span>
                <p className="text-[10px] text-slate-400">
                  Automatic (changes to 🎙 In Call when joining voice/video)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              System
            </span>
          </div>

          {/* User Activity Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Choose Activity Status
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {ACTIVITY_PRESETS.map((preset) => {
                const isSelected = selectedActivity === preset.text && !customText.trim();
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.text)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer text-left ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span className="truncate">{preset.text}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Activity Input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Or write custom status
            </label>
            <input
              type="text"
              placeholder="e.g. Solving 2024 Past Paper..."
              value={customText}
              onChange={handleCustomTextChange}
              maxLength={40}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Preview:</span>
            <UserStatusBadge
              status={{
                presence: currentPresence,
                activity: customText.trim() ? customText.trim() : selectedActivity,
              }}
              size="sm"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              Save Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
