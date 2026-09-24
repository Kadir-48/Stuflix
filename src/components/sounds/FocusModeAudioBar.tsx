import React from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Headphones,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { useFocusSounds } from '../../context/FocusSoundsContext';

interface FocusModeAudioBarProps {
  onOpenSoundPicker: () => void;
}

export const FocusModeAudioBar: React.FC<FocusModeAudioBarProps> = ({ onOpenSoundPicker }) => {
  const {
    isPlaying,
    activeTracks,
    masterVolume,
    isMuted,
    lastPlayedSoundId,
    playSound,
    toggleSound,
    stopAll,
    setMasterVolume,
    toggleMute,
    getSoundById,
    sounds,
  } = useFocusSounds();

  const currentSound =
    activeTracks.length > 0
      ? getSoundById(activeTracks[0].soundId)
      : lastPlayedSoundId
      ? getSoundById(lastPlayedSoundId)
      : sounds[0];

  const handleQuickToggle = () => {
    if (activeTracks.length > 0) {
      stopAll();
    } else if (currentSound) {
      playSound(currentSound.id, masterVolume);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs shadow-lg border border-slate-700/80 backdrop-blur-md">
      {/* Quick Play/Pause button */}
      <button
        onClick={handleQuickToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
          isPlaying
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title={isPlaying ? 'Pause Focus Ambience' : 'Play Focus Ambience'}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Playing</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Play</span>
          </>
        )}
      </button>

      {/* Sound selector button */}
      <button
        onClick={onOpenSoundPicker}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition cursor-pointer max-w-[140px] sm:max-w-xs truncate"
      >
        <span className="text-sm">{currentSound?.icon || '🌧'}</span>
        <span className="truncate font-medium">{currentSound?.title || 'Rain'}</span>
        {activeTracks.length > 1 && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-300 font-mono">
            +{activeTracks.length - 1}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
      </button>

      {/* Volume Slider */}
      <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-slate-700">
        <button
          onClick={toggleMute}
          className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : masterVolume}
          onChange={(e) => setMasterVolume(parseInt(e.target.value, 10))}
          className="w-16 accent-blue-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
        />
        <span className="text-[10px] font-mono text-slate-400 w-6">
          {isMuted ? '0%' : `${masterVolume}%`}
        </span>
      </div>

      {/* Open full soundboard */}
      <button
        onClick={onOpenSoundPicker}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
        title="Open Full Sound Mixer"
      >
        <Sliders className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
