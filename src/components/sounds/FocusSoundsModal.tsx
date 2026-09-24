import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Star,
  Sparkles,
  Sliders,
  X,
  RotateCcw,
  Check,
  Headphones,
  Compass,
} from 'lucide-react';
import { useFocusSounds } from '../../context/FocusSoundsContext';
import { SoundCategory, SoundItem, SoundPreset } from '../../types';

interface FocusSoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: SoundCategory | 'all' | 'favorites'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Sounds', icon: '✨' },
  { id: 'nature', label: 'Nature', icon: '🌧' },
  { id: 'ambient', label: 'Ambient', icon: '☕' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'focus', label: 'Focus Noise', icon: '🧠' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
];

export const FocusSoundsModal: React.FC<FocusSoundsModalProps> = ({ isOpen, onClose }) => {
  const {
    sounds,
    presets,
    activeTracks,
    masterVolume,
    isMuted,
    favorites,
    toggleSound,
    stopSound,
    stopAll,
    setSoundVolume,
    setMasterVolume,
    toggleMute,
    applyPreset,
    toggleFavorite,
    getSoundById,
  } = useFocusSounds();

  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredSounds = sounds.filter((s) => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'favorites'
        ? favorites.includes(s.id)
        : s.category === selectedCategory;

    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.recommendedSubject && s.recommendedSubject.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Focus Sounds & Study Ambience
                </h3>
                {activeTracks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{activeTracks.length} Active</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Layer calming nature, room ambience, and focus noise for deep study concentration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Mixer & Presets Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-850/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
              Presets:
            </span>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 text-xs font-medium transition cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Master Volume & Global Stop */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
              title={isMuted ? 'Unmute Master' : 'Mute Master'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => setMasterVolume(parseInt(e.target.value, 10))}
                className="w-20 sm:w-28 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-7 text-right">
                {isMuted ? '0%' : `${masterVolume}%`}
              </span>
            </div>

            {activeTracks.length > 0 && (
              <button
                onClick={stopAll}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer"
              >
                Stop All
              </button>
            )}
          </div>
        </div>

        {/* Active Tracks Mixer (when any sounds are playing) */}
        {activeTracks.length > 0 && (
          <div className="px-5 py-2.5 bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Active Sound Mixer ({activeTracks.length})</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {activeTracks.map((track) => {
                const sound = getSoundById(track.soundId);
                if (!sound) return null;
                return (
                  <div
                    key={track.soundId}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/60 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">{sound.icon}</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {sound.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={track.volume}
                        onChange={(e) => setSoundVolume(track.soundId, parseInt(e.target.value, 10))}
                        className="w-16 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                      <button
                        onClick={() => stopSound(track.soundId)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                        title="Remove Sound"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Tabs & Search Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search sounds (e.g. Rain, Cafe, Math)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 w-full sm:w-60"
          />
        </div>

        {/* Sound Cards Grid */}
        <div className="p-5 overflow-y-auto flex-1">
          {filteredSounds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No sounds match your filter.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for a different term or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredSounds.map((sound) => {
                const activeTrack = activeTracks.find((t) => t.soundId === sound.id);
                const isPlayingThis = Boolean(activeTrack);
                const isFav = favorites.includes(sound.id);

                return (
                  <div
                    key={sound.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                      isPlayingThis
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500/80 shadow-xs'
                        : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top icon and favorite button */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                            {sound.icon}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {sound.title}
                            </h4>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {sound.category}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleFavorite(sound.id)}
                          className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {sound.description}
                      </p>

                      {sound.recommendedSubject && (
                        <div className="mb-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            🎯 Ideal for: {sound.recommendedSubject}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom playback & volume control */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleSound(sound.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isPlayingThis
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isPlayingThis ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      {isPlayingThis && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={activeTrack?.volume ?? 70}
                            onChange={(e) =>
                              setSoundVolume(sound.id, parseInt(e.target.value, 10))
                            }
                            className="w-16 accent-blue-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-700 rounded-lg"
                          />
                          <span className="text-[10px] font-mono text-slate-400">
                            {activeTrack?.volume ?? 70}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>🎧 High-fidelity procedural audio engine (100% offline & zero latency)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
