import React, { useEffect, useRef, useState } from 'react';
import { Participant, Track, VideoTrack, ConnectionQuality } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, Monitor, Wifi, Signal } from 'lucide-react';

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
  isTheaterMode?: boolean;
  localMicEnabled?: boolean;
  localCamEnabled?: boolean;
  isHandRaised?: boolean;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal = false,
  isActiveSpeaker = false,
  isTheaterMode = false,
  localMicEnabled,
  localCamEnabled,
  isHandRaised = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTrack, setVideoTrack] = useState<VideoTrack | null>(null);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [internalAudioMuted, setInternalAudioMuted] = useState(!participant.isMicrophoneEnabled);
  const [internalVideoDisabled, setInternalVideoDisabled] = useState(!participant.isCameraEnabled);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(participant.connectionQuality);

  // Authoritative media state separation:
  // For local participant, lock state to the explicit localMicEnabled/localCamEnabled props to completely
  // eliminate transient WebRTC renegotiation glitch / flicker when toggling different media devices.
  const isAudioMuted =
    isLocal && localMicEnabled !== undefined ? !localMicEnabled : internalAudioMuted;
  const isVideoDisabled =
    isLocal && localCamEnabled !== undefined ? !localCamEnabled : internalVideoDisabled;

  useEffect(() => {
    const updateVideoTrack = () => {
      const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);
      const cameraPub = participant.getTrackPublication(Track.Source.Camera);

      if (screenPub && screenPub.track && (screenPub.isSubscribed || isLocal)) {
        setVideoTrack(screenPub.track as VideoTrack);
        setIsScreenShare(true);
        setInternalVideoDisabled(false);
      } else if (cameraPub && cameraPub.track && (cameraPub.isSubscribed || isLocal)) {
        setVideoTrack(cameraPub.track as VideoTrack);
        setIsScreenShare(false);
        const shouldDisable = isLocal
          ? (localCamEnabled !== undefined ? !localCamEnabled : !participant.isCameraEnabled)
          : cameraPub.isMuted;
        setInternalVideoDisabled(shouldDisable);
      } else {
        setVideoTrack(null);
        setIsScreenShare(false);
        setInternalVideoDisabled(true);
      }
    };

    const updateAudioTrack = () => {
      setInternalAudioMuted(!participant.isMicrophoneEnabled);
    };

    // Initial load
    updateVideoTrack();
    updateAudioTrack();

    // Specific track events: isolate video from audio so one never flickers the other!
    const handleTrackSubscribed = (track: Track) => {
      if (track.kind === Track.Kind.Video) updateVideoTrack();
      else if (track.kind === Track.Kind.Audio) updateAudioTrack();
    };

    const handleTrackUnsubscribed = (track: Track) => {
      if (track.kind === Track.Kind.Video) updateVideoTrack();
      else if (track.kind === Track.Kind.Audio) updateAudioTrack();
    };

    const handleTrackMuted = (pub: any) => {
      if (pub?.kind === Track.Kind.Video) updateVideoTrack();
      else if (pub?.kind === Track.Kind.Audio) updateAudioTrack();
      else updateAudioTrack();
    };

    const handleTrackUnmuted = (pub: any) => {
      if (pub?.kind === Track.Kind.Video) updateVideoTrack();
      else if (pub?.kind === Track.Kind.Audio) updateAudioTrack();
      else updateAudioTrack();
    };

    const handleQualityChanged = (q: ConnectionQuality) => setConnectionQuality(q);

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
    participant.on('trackMuted', handleTrackMuted);
    participant.on('trackUnmuted', handleTrackUnmuted);
    participant.on('connectionQualityChanged', handleQualityChanged);

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
      participant.off('trackUnsubscribed', handleTrackUnsubscribed);
      participant.off('trackMuted', handleTrackMuted);
      participant.off('trackUnmuted', handleTrackUnmuted);
      participant.off('connectionQualityChanged', handleQualityChanged);
    };
  }, [participant, isLocal, localCamEnabled, localMicEnabled]);

  // Attach video track to <video> element
  useEffect(() => {
    const el = videoRef.current;
    if (el && videoTrack && !isVideoDisabled) {
      videoTrack.attach(el);
      el.autoplay = true;
      el.playsInline = true;
      el.play().catch(() => {});

      return () => {
        try {
          videoTrack.detach(el);
        } catch {
          // Ignore detach errors
        }
      };
    }
  }, [videoTrack, isVideoDisabled]);

  // Quality visual representation
  const renderQualityBars = () => {
    let activeBars = 4;
    let colorClass = 'text-emerald-500';

    if (connectionQuality === ConnectionQuality.Excellent) {
      activeBars = 4;
      colorClass = 'text-emerald-500';
    } else if (connectionQuality === ConnectionQuality.Good) {
      activeBars = 3;
      colorClass = 'text-emerald-400';
    } else if (connectionQuality === ConnectionQuality.Poor) {
      activeBars = 2;
      colorClass = 'text-amber-500';
    } else {
      activeBars = 1;
      colorClass = 'text-rose-500';
    }

    return (
      <div className="flex items-center gap-0.5 px-2 py-1 rounded bg-slate-950/70 backdrop-blur-xs text-[10px] text-slate-300">
        <Signal className={`w-3 h-3 mr-1 ${colorClass}`} />
        <div className="flex items-end gap-0.5 h-3">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-0.5 rounded-xs transition-all ${
                bar <= activeBars ? colorClass.replace('text-', 'bg-') : 'bg-slate-700'
              }`}
              style={{ height: `${bar * 25}%` }}
            />
          ))}
        </div>
      </div>
    );
  };

  const displayName = participant.name || participant.identity || 'Student';

  return (
    <div
      id={`participant-tile-${participant.identity}`}
      className={`relative group rounded-xl overflow-hidden bg-slate-900 border transition-all duration-200 flex flex-col items-center justify-center ${
        isActiveSpeaker
          ? 'border-emerald-500 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/40'
          : 'border-slate-800 hover:border-slate-700'
      } ${isTheaterMode ? 'w-full h-full min-h-[360px]' : 'aspect-video min-h-[180px]'}`}
    >
      {/* Video Stream */}
      <video
        ref={videoRef}
        id={`video-element-${participant.identity}`}
        className={`w-full h-full object-cover transition-opacity duration-150 ${
          isLocal && !isScreenShare ? 'scale-x-[-1]' : ''
        } ${!videoTrack || isVideoDisabled ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100'}`}
        autoPlay
        playsInline
        muted={isLocal}
      />

      {/* Video Off Avatar Placeholder */}
      {(!videoTrack || isVideoDisabled) && (
        <div className="flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xl mb-2 shadow-inner">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-slate-400 text-sm font-medium">Camera is off</span>
        </div>
      )}

      {/* Screen share badge */}
      {isScreenShare && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-600/90 text-white text-xs font-semibold backdrop-blur-xs">
          <Monitor className="w-3.5 h-3.5" />
          <span>Screen Share</span>
        </div>
      )}

      {/* Raised Hand badge */}
      {isHandRaised && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-lg animate-bounce z-20">
          <span>✋</span>
          <span>Hand Raised</span>
        </div>
      )}

      {/* Top Right: Connection Quality */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {renderQualityBars()}
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 max-w-[70%]">
          <span className="text-slate-100 text-xs sm:text-sm font-semibold truncate drop-shadow">
            {displayName} {isLocal && '(You)'}
          </span>
          {isActiveSpeaker && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Speaking
            </span>
          )}
        </div>

        {/* Audio / Video Status icons */}
        <div className="flex items-center gap-1.5">
          <div
            className={`p-1.5 rounded-full ${
              isAudioMuted ? 'bg-rose-500/80 text-white' : 'bg-slate-800/80 text-emerald-400'
            }`}
            title={isAudioMuted ? 'Microphone muted' : 'Microphone active'}
          >
            {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </div>

          <div
            className={`p-1.5 rounded-full ${
              isVideoDisabled ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-800/80 text-emerald-400'
            }`}
            title={isVideoDisabled ? 'Camera off' : 'Camera active'}
          >
            {isVideoDisabled ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>
    </div>
  );
};
