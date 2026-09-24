import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  Participant,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  ConnectionQuality,
  RemoteTrackPublication,
  RemoteTrack,
} from 'livekit-client';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Settings,
  Activity,
  Volume2,
  VolumeX,
  AlertTriangle,
  RefreshCw,
  Users,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ParticipantTile } from './ParticipantTile';
import { DeviceSelectorModal } from './DeviceSelectorModal';
import { CallStatsModal } from './CallStatsModal';
import { CallInfoState } from './FloatingCallBar';
import { getRecommendedRoomOptions, getRecommendedConnectOptions } from '../../lib/livekitConfig';
import { LiveKitTokenResponse, LiveKitStatusResponse } from '../../types';
import { getSocket } from '../../lib/socket';
import { safeFetchJson } from '../../lib/api';

export interface StudyCallRoomHandle {
  toggleMic: () => Promise<void>;
  toggleCam: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  leaveCall: () => void;
  joinCall: () => Promise<void>;
  getParticipants: () => Participant[];
  getConnectionState: () => ConnectionState;
}

export interface StudyCallRoomProps {
  roomCode: string;
  roomTitle: string;
  studentId: string;
  studentName: string;
  onLeaveCall?: () => void;
  onCallStateChange?: (inCall: boolean, isMuted: boolean, isVideoOff: boolean, isScreenSharing: boolean) => void;
  onCallInfoChange?: (info: CallInfoState) => void;
}

export const StudyCallRoom = forwardRef<StudyCallRoomHandle, StudyCallRoomProps>(({
  roomCode,
  roomTitle,
  studentId,
  studentName,
  onLeaveCall,
  onCallStateChange,
  onCallInfoChange,
}, ref) => {
  // LiveKit Room instance & container refs
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);

  // Connection State
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [livekitStatus, setLivekitStatus] = useState<LiveKitStatusResponse | null>(null);

  // Fullscreen / Maximize State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  // Local Controls
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHandsMap, setRaisedHandsMap] = useState<Record<string, boolean>>({});

  // Verification states
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [micPublishingVerified, setMicPublishingVerified] = useState(false);
  const [remoteAudioSubscribed, setRemoteAudioSubscribed] = useState(false);

  // Modals
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [showParticipantDrawer, setShowParticipantDrawer] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Fullscreen / Maximize handler (Task F)
  const toggleFullscreen = async () => {
    const el = callContainerRef.current;
    if (!el) return;

    const isNativeFs = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement
    );

    if (isNativeFs || isFullscreen) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      } catch {
        // Fallback for iframe sandbox restrictions
      }
      setIsFullscreen(false);
    } else {
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch {
        // Graceful viewport maximize fallback if iframe disallows native fullscreen
        setIsFullscreen(true);
      }
    }
  };

  // Synchronize fullscreen state with document events
  useEffect(() => {
    const onFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Prevent background scrolling while fullscreen / maximized
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Keyboard shortcut: Escape or 'f' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA'].includes(targetTag)) return;

      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Unblock audio playback on user interaction
  const handleContainerClick = () => {
    if (audioPlaybackBlocked && roomRef.current) {
      roomRef.current.startAudio().then(() => {
        setAudioPlaybackBlocked(!roomRef.current?.canPlaybackAudio);
      }).catch(() => {});
    }
  };

  // Check LiveKit API status
  const checkStatus = async () => {
    try {
      const res = await safeFetchJson<LiveKitStatusResponse>('/api/livekit/status');
      if (res.ok && res.data) {
        setLivekitStatus(res.data);
      }
    } catch (e) {
      console.error('Failed to query LiveKit status:', e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Sync state upward to parent (for chat/roster indicators)
  useEffect(() => {
    const inCall = connectionState === ConnectionState.Connected;
    onCallStateChange?.(inCall, !isMicEnabled, !isCamEnabled, isScreenSharing);

    const participantNames = participants.map((p) => p.name || p.identity || 'Student');
    let activeSpeakerName: string | null = null;
    if (activeSpeaker) {
      const speakerP = participants.find((p) => p.identity === activeSpeaker);
      activeSpeakerName = speakerP ? (speakerP.name || speakerP.identity) : activeSpeaker;
    }

    onCallInfoChange?.({
      inCall,
      isMicEnabled,
      isCamEnabled,
      isScreenSharing,
      participantCount: participants.length || (inCall ? 1 : 0),
      activeSpeaker: activeSpeakerName,
      participantNames,
    });
  }, [connectionState, isMicEnabled, isCamEnabled, isScreenSharing, participants, activeSpeaker, onCallStateChange, onCallInfoChange]);

  // Lifecycle & Diagnostics Logging & Hand Raise Listener
  useEffect(() => {
    console.log('[Component Mount] StudyCallRoom mounted for roomCode:', roomCode);

    const socket = getSocket();
    const handleHandRaiseUpdated = ({ studentName, isHandRaised }: { studentName: string; isHandRaised: boolean }) => {
      setRaisedHandsMap((prev) => ({ ...prev, [studentName]: isHandRaised }));
      if (isHandRaised && studentName !== studentName) {
        showNotification(`✋ ${studentName} raised their hand`);
      }
    };

    socket.on('hand_raise_updated', handleHandRaiseUpdated);

    return () => {
      console.log('[Component Unmount] StudyCallRoom unmounted for roomCode:', roomCode);
      socket.off('hand_raise_updated', handleHandRaiseUpdated);
    };
  }, [roomCode, studentName]);

  // Handle participant roster updates
  const updateParticipantList = useCallback((room: Room) => {
    const allParticipants: Participant[] = [];
    if (room.localParticipant) {
      allParticipants.push(room.localParticipant);
    }
    room.remoteParticipants.forEach((rp) => {
      allParticipants.push(rp);
    });
    setParticipants([...allParticipants]);

    // Check remote audio subscriptions
    let anySubscribedAudio = false;
    room.remoteParticipants.forEach((rp) => {
      rp.trackPublications.forEach((pub) => {
        if (pub.kind === Track.Kind.Audio && pub.isSubscribed) {
          anySubscribedAudio = true;
        }
      });
    });
    setRemoteAudioSubscribed(anySubscribedAudio);
  }, []);

  // Connect to LiveKit Room
  const joinCall = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setErrorDetails(null);

    // Task A: Parameter Validation & Tracing
    const effectiveRoomId = (roomCode || '').trim();
    const effectiveStudentName = (studentName || localStorage.getItem('stuflix_student_name') || localStorage.getItem('studyhub_student_name') || 'Student').trim();
    const effectiveSessionId = (studentId || localStorage.getItem('stuflix_session_id') || localStorage.getItem('studyhub_session_id') || `stu_${Math.random().toString(36).substring(2, 9)}`).trim();

    console.log('[Call connect] Joining call for room:', effectiveRoomId, 'Student:', effectiveStudentName);

    if (!effectiveRoomId) {
      setErrorMessage('Room ID is required');
      setErrorDetails('The study room code could not be determined. Please navigate back and re-enter the room.');
      setIsConnecting(false);
      return;
    }

    if (!effectiveStudentName) {
      setErrorMessage('Student Name is required');
      setErrorDetails('Please ensure a valid name is assigned to your session before joining the call.');
      setIsConnecting(false);
      return;
    }

    try {
      // 1. Fetch token from server with all required identity fields
      const result = await safeFetchJson<LiveKitTokenResponse & {
        configured?: boolean;
        missingVariables?: string[];
        hint?: string;
        details?: string;
      }>('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: effectiveRoomId,
          roomName: effectiveRoomId,
          studentName: effectiveStudentName,
          participantName: effectiveStudentName,
          sessionId: effectiveSessionId,
          participantIdentity: effectiveSessionId,
        }),
      });

      type TokenDataPayload = Partial<LiveKitTokenResponse & {
        configured?: boolean;
        missingVariables?: string[];
        hint?: string;
        details?: string;
        error?: string;
      }>;

      if (!result.ok || !result.data?.token) {
        const tokenData: TokenDataPayload = result.data || {};
        setErrorMessage(tokenData.error || result.error || 'Failed to acquire study call token');
        const missing = tokenData.missingVariables?.length ? ` Missing: ${tokenData.missingVariables.join(', ')}.` : '';
        setErrorDetails((tokenData.hint || tokenData.details || 'Check your LiveKit environment variables in Settings') + missing);
        setIsConnecting(false);
        checkStatus();
        return;
      }

      const { token, url, iceServers, configured, missingVariables } = result.data;

      // Validate LiveKit URL protocol before attempting connection
      if (!url || (!url.startsWith('wss://') && !url.startsWith('ws://'))) {
        setErrorMessage('LiveKit URL Configuration Error');
        setErrorDetails(
          `LIVEKIT_URL is currently '${url || 'empty'}'. LiveKit Cloud requires a WebSocket endpoint starting with wss:// (e.g. wss://your-subdomain.livekit.cloud). Update in Settings > Secrets.`
        );
        setIsConnecting(false);
        checkStatus();
        return;
      }

      // Check if credentials are placeholders or pending (Task B)
      if (configured === false) {
        setErrorMessage('Check your LiveKit environment variables');
        const missing = missingVariables && missingVariables.length > 0
          ? `Pending: ${missingVariables.join(', ')}.`
          : 'Environment variables are currently placeholders.';
        setErrorDetails(
          `${missing} Please update LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET with valid credentials in AI Studio Settings > Secrets.`
        );
        setIsConnecting(false);
        checkStatus();
        return;
      }

      // 2. Initialize Room with optimized production configuration
      const roomOptions = getRecommendedRoomOptions();
      const connectOptions = getRecommendedConnectOptions(iceServers);
      const room = new Room(roomOptions);
      roomRef.current = room;

      // 3. Register Event Listeners
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('[Call connect] LiveKit ConnectionState changed to:', state);
        setConnectionState(state);
        if (state === ConnectionState.Connected) {
          showNotification('Connected to study call room');
        } else if (state === ConnectionState.Reconnecting) {
          showNotification('Reconnecting to call (network switch)...');
        }
      });

      room.on(RoomEvent.Reconnected, () => {
        showNotification('Reconnected to call');
        updateParticipantList(room);
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        updateParticipantList(room);
        showNotification(`${participant.name || 'A classmate'} joined the study call`);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        updateParticipantList(room);
        showNotification(`${participant.name || 'A classmate'} left the study call`);
      });

      // Audio autoplay detection
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setAudioPlaybackBlocked(!room.canPlaybackAudio);
      });

      // Active Speaker detection
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.length > 0) {
          setActiveSpeaker(speakers[0].identity);
        } else {
          setActiveSpeaker(null);
        }
      });

      // Track Subscriptions & RoomAudioRenderer (Task C & D)
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.id = `audio-track-${participant.identity}`;
          audioElement.autoplay = true;
          audioElement.setAttribute('playsinline', 'true');
          if (audioContainerRef.current) {
            audioContainerRef.current.appendChild(audioElement);
          }
          audioElement.play().catch(() => {
            setAudioPlaybackBlocked(true);
          });
          setRemoteAudioSubscribed(true);
        }
        updateParticipantList(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach();
          const el = document.getElementById(`audio-track-${participant.identity}`);
          if (el) el.remove();
        }
        updateParticipantList(room);
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.kind === Track.Kind.Audio) {
          setMicPublishingVerified(true);
        }
        updateParticipantList(room);
      });

      // 4. Connect to Room
      await room.connect(url, token, connectOptions);

      // Check if browser allows immediate audio playback
      if (!room.canPlaybackAudio) {
        setAudioPlaybackBlocked(true);
      }

      // Attach any remote audio tracks that arrived prior to handler binding
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track && pub.kind === Track.Kind.Audio) {
            const audioElement = pub.track.attach();
            audioElement.id = `audio-track-${participant.identity}`;
            audioElement.autoplay = true;
            audioElement.setAttribute('playsinline', 'true');
            if (audioContainerRef.current) {
              audioContainerRef.current.appendChild(audioElement);
            }
            audioElement.play().catch(() => setAudioPlaybackBlocked(true));
          }
        });
      });

      // 5. Publish local microphone & camera
      try {
        await room.localParticipant.enableCameraAndMicrophone();
        setIsMicEnabled(true);
        setIsCamEnabled(true);
        setMicPublishingVerified(true);
      } catch (devErr: any) {
        console.warn('Camera/Mic permission notice:', devErr);
        // If camera fails (e.g. no webcam on desktop), try audio only
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMicEnabled(true);
          setIsCamEnabled(false);
          setMicPublishingVerified(true);
        } catch {
          setIsMicEnabled(false);
          setIsCamEnabled(false);
        }
      }

      updateParticipantList(room);
      setIsConnecting(false);
    } catch (err: any) {
      console.error('Call connection failed:', err);
      setErrorMessage(err.message || 'Failed to establish LiveKit call');
      setErrorDetails('Verify that LIVEKIT_URL is accessible and credentials are valid in AI Studio Settings.');
      setIsConnecting(false);
    }
  };

  // Leave Call
  const leaveCall = async () => {
    console.log('[Call disconnect] Leaving study call for roomCode:', roomCode);
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setConnectionState(ConnectionState.Disconnected);
    setParticipants([]);
    setIsScreenSharing(false);
    setMicPublishingVerified(false);
    setRemoteAudioSubscribed(false);
    onLeaveCall?.();
  };

  // Autoplay Unblock Handler
  const handleStartAudio = async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.startAudio();
        setAudioPlaybackBlocked(false);
        showNotification('Audio output enabled');
      } catch (err) {
        console.error('startAudio error:', err);
      }
    }
  };

  // Toggle Microphone (isolated from camera & screen share)
  const toggleMicrophone = async () => {
    if (!roomRef.current?.localParticipant) return;
    const nextState = !isMicEnabled;
    console.log('[Media control] Toggling microphone to:', nextState ? 'ON' : 'OFF');
    // Optimistic state: 0ms button response without waiting for WebRTC renegotiation
    setIsMicEnabled(nextState);
    setMicPublishingVerified(nextState);
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState);
    } catch (e: any) {
      console.error('Failed to toggle mic:', e);
      setIsMicEnabled(!nextState);
      setMicPublishingVerified(!nextState);
    }
  };

  // Toggle Camera (isolated from microphone & screen share)
  const toggleCamera = async () => {
    if (!roomRef.current?.localParticipant) return;
    const nextState = !isCamEnabled;
    console.log('[Media control] Toggling camera to:', nextState ? 'ON' : 'OFF');
    // Optimistic state: immediate UI response, zero flicker
    setIsCamEnabled(nextState);
    try {
      await roomRef.current.localParticipant.setCameraEnabled(nextState);
    } catch (e: any) {
      console.error('Failed to toggle camera:', e);
      setIsCamEnabled(!nextState);
    }
  };

  // Toggle Screen Share (isolated from microphone & camera)
  const toggleScreenShare = async () => {
    if (!roomRef.current?.localParticipant) return;
    const nextState = !isScreenSharing;
    console.log('[Media control] Toggling screen share to:', nextState ? 'ON' : 'OFF');
    setIsScreenSharing(nextState);
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(nextState, {
        audio: true,
        selfBrowserSurface: 'include',
      });
    } catch (e: any) {
      // User cancelled browser screen share picker
      console.warn('Screen share toggle info:', e);
      setIsScreenSharing(false);
    }
  };

  // Toggle Raise Hand
  const toggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    const effectiveStudentName = (studentName || localStorage.getItem('stuflix_student_name') || 'Student').trim();
    setRaisedHandsMap((prev) => ({ ...prev, [effectiveStudentName]: nextState }));
    getSocket().emit('toggle_hand_raise', {
      roomId: roomCode,
      studentName: effectiveStudentName,
      isHandRaised: nextState,
    });
    showNotification(nextState ? 'You raised your hand ✋' : 'You lowered your hand');
  };

  // Expose imperative handle for FloatingCallBar & parent controls
  useImperativeHandle(ref, () => ({
    toggleMic: toggleMicrophone,
    toggleCam: toggleCamera,
    toggleScreenShare,
    leaveCall,
    joinCall,
    getParticipants: () => participants,
    getConnectionState: () => connectionState,
  }), [isMicEnabled, isCamEnabled, isScreenSharing, participants, connectionState]);

  // Auto clean up on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  // Screen share participant if active
  const screenShareParticipant = participants.find((p) => {
    const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
    return screenPub && !screenPub.isMuted;
  });

  return (
    <div
      ref={callContainerRef}
      id="study-call-container"
      onClick={handleContainerClick}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen m-0 p-0 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none'
          : 'flex flex-col h-full bg-slate-950 text-slate-100 relative overflow-hidden rounded-2xl border border-slate-800'
      }
    >
      {/* Invisible audio element container for RoomAudioRenderer (Task C - not hidden/display:none to prevent WebKit audio suspension) */}
      <div
        ref={audioContainerRef}
        id="livekit-audio-renderer-container"
        className="fixed -top-96 -left-96 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      />

      {/* Top Notification Toast */}
      {notificationMsg && (
        <div id="call-toast-notification" className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-slate-200 border border-slate-700 px-4 py-2 rounded-full text-xs font-medium shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {notificationMsg}
        </div>
      )}

      {/* Browser Autoplay Blocked Banner with startAudio() */}
      {audioPlaybackBlocked && connectionState === ConnectionState.Connected && (
        <div id="autoplay-unlock-banner" className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between z-30 shadow-md animate-pulse">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <VolumeX className="w-4 h-4 shrink-0" />
            <span>Browser audio is restricted by autoplay policy. Click to hear classmates.</span>
          </div>
          <button
            id="unblock-audio-button"
            onClick={handleStartAudio}
            className="px-3 py-1 bg-white text-slate-900 font-bold rounded-lg text-xs hover:bg-amber-100 transition shadow-xs"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Top Call Info Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              connectionState === ConnectionState.Connected ? 'bg-emerald-400 animate-pulse' :
              connectionState === ConnectionState.Reconnecting ? 'bg-amber-400 animate-spin' :
              'bg-slate-500'
            }`} />
            <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate max-w-[200px] sm:max-w-xs">
              {roomTitle} Call
            </h2>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            Room Code: {roomCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio & Network Health Badges */}
          {connectionState === ConnectionState.Connected && (
            <>
              <div
                id="mic-publishing-status-badge"
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  micPublishingVerified
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
                title="Microphone publishing verification"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{micPublishingVerified ? 'Mic Streaming' : 'Mic Off'}</span>
              </div>

              <div
                id="remote-audio-status-badge"
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  remoteAudioSubscribed
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Remote audio subscription verification"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{remoteAudioSubscribed ? 'Audio Linked' : 'Listening'}</span>
              </div>
            </>
          )}

          {/* Diagnostics Button */}
          <button
            id="open-call-diagnostics-btn"
            onClick={() => setIsStatsModalOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
            title="Connection Diagnostics & ICE status"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Fullscreen / Maximize Button (Task F) */}
          <button
            id="toggle-fullscreen-top-btn"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
            title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Maximize / Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Participant Count toggle */}
          <button
            id="toggle-participant-list-btn"
            onClick={() => setShowParticipantDrawer(!showParticipantDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{participants.length}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Video Grid or Pre-Join Screen */}
      <div className="flex-1 flex overflow-hidden relative">
        {connectionState === ConnectionState.Disconnected ? (
          /* Pre-join screen */
          <div id="pre-join-screen" className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg">
              <Video className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-100 mb-2">Study Call: #{roomTitle}</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md">
              Private call for 10th grade study group. Join with camera, microphone, and screen share for solving past papers together.
            </p>

            {/* Error or configuration alert */}
            {errorMessage && (
              <div id="call-error-alert" className="w-full mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-rose-300">{errorMessage}</h4>
                    {errorDetails && <p className="text-xs text-rose-200/80">{errorDetails}</p>}
                  </div>
                </div>

                {livekitStatus && !livekitStatus.configured && (
                  <div className="mt-3 pt-3 border-t border-rose-500/20 text-xs text-slate-300 space-y-1.5 font-mono">
                    <div className="text-slate-200 font-sans font-medium">Call Engine Configuration:</div>
                    <div>Call Gateway: {livekitStatus.urlConfigured ? '✓ Ready' : '✗ Not connected'}</div>
                    <div>Auth Key: {livekitStatus.apiKeyConfigured ? '✓ Configured' : '✗ Pending'}</div>
                    <div>Auth Secret: {livekitStatus.apiSecretConfigured ? '✓ Configured' : '✗ Pending'}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                id="join-study-call-btn"
                onClick={joinCall}
                disabled={isConnecting}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting Call Engine...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Join Call Now</span>
                  </>
                )}
              </button>

              <button
                id="recheck-livekit-status-btn"
                onClick={checkStatus}
                className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check Status</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Call Video Arena */
          <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto">
            {/* Screen Share Theater View if someone is sharing */}
            {screenShareParticipant && (
              <div id="screen-share-theater" className="mb-4 flex-1 min-h-[320px] rounded-xl overflow-hidden border border-blue-500/40 bg-slate-900 shadow-xl">
                <ParticipantTile
                  participant={screenShareParticipant}
                  isLocal={screenShareParticipant instanceof LocalParticipant}
                  isActiveSpeaker={activeSpeaker === screenShareParticipant.identity}
                  localMicEnabled={screenShareParticipant instanceof LocalParticipant ? isMicEnabled : undefined}
                  localCamEnabled={screenShareParticipant instanceof LocalParticipant ? isCamEnabled : undefined}
                  isTheaterMode
                />
              </div>
            )}

            {/* Video Grid */}
            <div
              id="video-tiles-grid"
              className={`grid gap-3 sm:gap-4 flex-1 items-center justify-center ${
                participants.length === 1
                  ? 'grid-cols-1 max-w-2xl mx-auto w-full'
                  : participants.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : participants.length <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-2 md:grid-cols-3'
              }`}
            >
              {participants.map((p) => {
                const isLocalParticipant = p instanceof LocalParticipant;
                const pName = p.name || p.identity || '';
                return (
                  <ParticipantTile
                    key={p.identity}
                    participant={p}
                    isLocal={isLocalParticipant}
                    isActiveSpeaker={activeSpeaker === p.identity}
                    localMicEnabled={isLocalParticipant ? isMicEnabled : undefined}
                    localCamEnabled={isLocalParticipant ? isCamEnabled : undefined}
                    isHandRaised={Boolean(raisedHandsMap[pName])}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Side Participant Drawer */}
        {showParticipantDrawer && (
          <div id="participant-roster-drawer" className="w-64 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Call Roster ({participants.length})
              </span>
              <button
                onClick={() => setShowParticipantDrawer(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {participants.map((p) => {
                const isLocal = p instanceof LocalParticipant;
                const isMuted = !p.isMicrophoneEnabled;
                return (
                  <div
                    key={p.identity}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {(p.name || p.identity).substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-200 font-medium truncate">
                        {p.name || p.identity} {isLocal && '(You)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMuted ? (
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      {connectionState === ConnectionState.Connected && (
        <div id="call-controls-bar" className="px-4 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-center gap-2 sm:gap-3 backdrop-blur-md z-20">
          {/* Mute/Unmute Mic */}
          <button
            id="toggle-mic-btn"
            onClick={toggleMicrophone}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
              isMicEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title={isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMicEnabled ? 'Mute' : 'Unmute'}</span>
          </button>

          {/* Camera On/Off */}
          <button
            id="toggle-cam-btn"
            onClick={toggleCamera}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
              isCamEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title={isCamEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isCamEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isCamEnabled ? 'Stop Video' : 'Start Video'}</span>
          </button>

          {/* Screen Share */}
          <button
            id="toggle-screenshare-btn"
            onClick={toggleScreenShare}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">{isScreenSharing ? 'Sharing' : 'Share'}</span>
          </button>

          {/* Raise Hand Button */}
          <button
            id="toggle-hand-btn"
            onClick={toggleHandRaise}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
              isHandRaised
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <span>✋</span>
            <span className="hidden sm:inline">{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
          </button>

          {/* Hardware Device Settings */}
          <button
            id="open-device-settings-btn"
            onClick={() => setIsDeviceModalOpen(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Audio & Video Devices"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen / Maximize Toggle */}
          <button
            id="toggle-fullscreen-bottom-btn"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Leave Call */}
          <button
            id="leave-call-btn"
            onClick={leaveCall}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-rose-600/20 ml-2"
            title="Leave Call"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      )}

      {/* Device Switcher Modal */}
      <DeviceSelectorModal
        room={roomRef.current}
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      {/* Diagnostics / ICE Stats Modal */}
      <CallStatsModal
        room={roomRef.current}
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        roomId={roomCode}
        studentName={studentName}
        socketConnected={getSocket().connected}
        isMicOn={isMicEnabled}
        isCameraOn={isCamEnabled}
        micPermission={isMicEnabled ? 'granted' : 'muted'}
        cameraPermission={isCamEnabled ? 'granted' : 'disabled'}
        livekitStatus={livekitStatus}
      />
    </div>
  );
});

StudyCallRoom.displayName = 'StudyCallRoom';
