import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SoundItem, SoundPreset, SoundCategory, AppSettings } from '../types';
import { focusAudio, playNotificationChime, FOCUS_SOUNDS, SOUND_PRESETS } from '../lib/focusAudioEngine';

interface ActiveTrack {
  soundId: string;
  volume: number; // 0 - 100
}

interface FocusSoundsContextType {
  // Playback state
  isPlaying: boolean;
  activeTracks: ActiveTrack[];
  masterVolume: number; // 0 - 100
  isMuted: boolean;
  lastPlayedSoundId: string | null;
  favorites: string[];
  recentlyPlayed: string[];

  // App Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Actions
  playSound: (soundId: string, volume?: number) => void;
  toggleSound: (soundId: string) => void;
  stopSound: (soundId: string) => void;
  stopAll: () => void;
  setSoundVolume: (soundId: string, volume: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleMute: () => void;
  applyPreset: (preset: SoundPreset) => void;
  toggleFavorite: (soundId: string) => void;
  playChime: () => void;

  // Metadata & Helpers
  sounds: SoundItem[];
  presets: SoundPreset[];
  getSoundById: (id: string) => SoundItem | undefined;
}

const FocusSoundsContext = createContext<FocusSoundsContextType | undefined>(undefined);

const STORAGE_FAVORITES = 'stuflix_sound_favorites';
const STORAGE_RECENT = 'stuflix_sound_recents';
const STORAGE_LAST_PLAYED = 'stuflix_sound_last_played';
const STORAGE_SETTINGS = 'stuflix_app_settings';

export const FocusSoundsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTracks, setActiveTracks] = useState<ActiveTrack[]>([]);
  const [masterVolume, setMasterVolumeState] = useState<number>(70);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lastPlayedSoundId, setLastPlayedSoundId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_LAST_PLAYED) || 'brown_noise';
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVORITES);
      return saved ? JSON.parse(saved) : ['rain', 'brown_noise', 'lofi_beats'];
    } catch {
      return ['rain', 'brown_noise', 'lofi_beats'];
    }
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECENT);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // App Settings with persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      soundNotificationsEnabled: true,
      timerChimeEnabled: true,
      soundEffectsVolume: 80,
      theme: (localStorage.getItem('stuflix_dark_mode') === 'true' || localStorage.getItem('studyhub_dark_mode') === 'true') ? 'dark' : 'light',
    };
  });

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Save favorites & recents
  useEffect(() => {
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    if (lastPlayedSoundId) {
      localStorage.setItem(STORAGE_LAST_PLAYED, lastPlayedSoundId);
    }
  }, [lastPlayedSoundId]);

  const isPlaying = activeTracks.length > 0 && !isMuted;

  const playSound = useCallback((soundId: string, volume: number = 70) => {
    focusAudio.playSound(soundId, volume / 100);
    setActiveTracks((prev) => {
      const existing = prev.find((t) => t.soundId === soundId);
      if (existing) {
        return prev.map((t) => (t.soundId === soundId ? { ...t, volume } : t));
      }
      return [...prev, { soundId, volume }];
    });

    setLastPlayedSoundId(soundId);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((id) => id !== soundId);
      return [soundId, ...filtered].slice(0, 8);
    });
  }, []);

  const stopSound = useCallback((soundId: string) => {
    focusAudio.stopSound(soundId);
    setActiveTracks((prev) => prev.filter((t) => t.soundId !== soundId));
  }, []);

  const toggleSound = useCallback((soundId: string) => {
    const isCurrentlyActive = activeTracks.some((t) => t.soundId === soundId);
    if (isCurrentlyActive) {
      stopSound(soundId);
    } else {
      playSound(soundId);
    }
  }, [activeTracks, playSound, stopSound]);

  const stopAll = useCallback(() => {
    focusAudio.stopAll();
    setActiveTracks([]);
  }, []);

  const setSoundVolume = useCallback((soundId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    focusAudio.setSoundVolume(soundId, clamped / 100);
    setActiveTracks((prev) =>
      prev.map((t) => (t.soundId === soundId ? { ...t, volume: clamped } : t))
    );
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setMasterVolumeState(clamped);
    focusAudio.setMasterVolume(clamped / 100);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      focusAudio.setMuted(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: SoundPreset) => {
    stopAll();
    preset.sounds.forEach((s) => {
      playSound(s.soundId, s.volume);
    });
  }, [stopAll, playSound]);

  const toggleFavorite = useCallback((soundId: string) => {
    setFavorites((prev) =>
      prev.includes(soundId) ? prev.filter((id) => id !== soundId) : [...prev, soundId]
    );
  }, []);

  const playChime = useCallback(() => {
    if (settings.timerChimeEnabled && settings.soundNotificationsEnabled) {
      const vol = (settings.soundEffectsVolume ?? 80) / 100;
      playNotificationChime(vol);
    }
  }, [settings]);

  const getSoundById = useCallback((id: string) => {
    return FOCUS_SOUNDS.find((s) => s.id === id);
  }, []);

  return (
    <FocusSoundsContext.Provider
      value={{
        isPlaying,
        activeTracks,
        masterVolume,
        isMuted,
        lastPlayedSoundId,
        favorites,
        recentlyPlayed,
        settings,
        updateSettings,
        playSound,
        toggleSound,
        stopSound,
        stopAll,
        setSoundVolume,
        setMasterVolume,
        toggleMute,
        applyPreset,
        toggleFavorite,
        playChime,
        sounds: FOCUS_SOUNDS,
        presets: SOUND_PRESETS,
        getSoundById,
      }}
    >
      {children}
    </FocusSoundsContext.Provider>
  );
};

export function useFocusSounds() {
  const context = useContext(FocusSoundsContext);
  if (!context) {
    throw new Error('useFocusSounds must be used within a FocusSoundsProvider');
  }
  return context;
}
