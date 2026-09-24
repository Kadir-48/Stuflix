import React, { useState, useContext } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Volume2,
  Users,
  Radio,
  Monitor,
} from 'lucide-react';
import { RoomCallContext } from '../../context/RoomCallContext';

export interface CallInfoState {
  inCall: boolean;
  isMicEnabled: boolean;
  isCamEnabled: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  activeSpeaker: string | null;
  participantNames: string[];
}

interface FloatingCallBarProps {
  roomTitle: string;
  callInfo?: CallInfoState;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  onToggleScreenShare?: () => void;
  onReturnToCall?: () => void;
  onLeaveCall?: () => void;
}

export const FloatingCallBar: React.FC<FloatingCallBarProps> = ({
  roomTitle,
  callInfo: propCallInfo,
  onToggleMic: propOnToggleMic,
  onToggleCam: propOnToggleCam,
  onToggleScreenShare: propOnToggleScreenShare,
  onReturnToCall: propOnReturnToCall,
  onLeaveCall: propOnLeaveCall,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showRosterTooltip, setShowRosterTooltip] = useState(false);

  const context = useContext(RoomCallContext);
  const callInfo = propCallInfo || context?.callInfo;
  const onToggleMic = propOnToggleMic || context?.toggleMic;
  const onToggleCam = propOnToggleCam || context?.toggleCam;
  const onToggleScreenShare = propOnToggleScreenShare || context?.toggleScreenShare;
  const onReturnToCall = propOnReturnToCall || context?.returnToCall;
  const onLeaveCall = propOnLeaveCall || context?.leaveCall;

  if (!callInfo || !callInfo.inCall) return null;

  return (
    <div
      id="floating-call-miniplayer"
      className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2.5rem)] animate-in slide-in-from-bottom-5 duration-200 select-none shadow-2xl"
    >
      {isCollapsed ? (
        /* Collapsed Floating Pill */
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/95 hover:bg-slate-900 text-slate-100 rounded-full border border-slate-700 backdrop-blur-md shadow-xl transition">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={onReturnToCall}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold max-w-[120px] truncate">{roomTitle}</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-800/60">
              {callInfo.participantCount} in call
            </span>
          </div>

          <button
            onClick={onToggleMic}
            title={callInfo.isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            className={`p-1.5 rounded-full transition ${
              callInfo.isMicEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {callInfo.isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand Call Controls"
            className="p-1 rounded-full text-slate-400 hover:text-white transition"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Full Floating Miniplayer Dock */
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2.5 sm:px-4 sm:py-2.5 bg-slate-950/95 text-slate-100 rounded-2xl border border-slate-700/90 backdrop-blur-md shadow-2xl">
          {/* Room info & Active Speaker */}
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0 pr-1 sm:border-r sm:border-slate-800 sm:pr-3.5">
            <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={onReturnToCall} title="Click to view full video call">
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[180px]">
                    {roomTitle}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60 hidden sm:inline">
                    Live Call
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  {callInfo.activeSpeaker ? (
                    <>
                      <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
                      <span className="text-emerald-300 font-medium truncate">
                        {callInfo.activeSpeaker} speaking...
                      </span>
                    </>
                  ) : (
                    <span className="truncate">Audio streaming in background</span>
                  )}
                </div>
              </div>
            </div>

            {/* Participants Count with Tooltip */}
            <div
              className="relative"
              onMouseEnter={() => setShowRosterTooltip(true)}
              onMouseLeave={() => setShowRosterTooltip(false)}
            >
              <button
                onClick={onReturnToCall}
                className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-800 transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{callInfo.participantCount}</span>
              </button>

              {showRosterTooltip && callInfo.participantNames.length > 0 && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-44 p-2 bg-slate-900 text-slate-200 text-xs rounded-xl border border-slate-700 shadow-xl space-y-1">
                  <div className="font-semibold text-[11px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
                    In Call ({callInfo.participantNames.length})
                  </div>
                  {callInfo.participantNames.map((name, i) => (
                    <div key={i} className="truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            {/* Mic Toggle */}
            <button
              id="miniplayer-toggle-mic-btn"
              onClick={onToggleMic}
              title={callInfo.isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                callInfo.isMicEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
              }`}
            >
              {callInfo.isMicEnabled ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">Mute</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Unmute</span>
                </>
              )}
            </button>

            {/* Cam Toggle */}
            <button
              id="miniplayer-toggle-cam-btn"
              onClick={onToggleCam}
              title={callInfo.isCamEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                callInfo.isCamEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-slate-800/60 hover:bg-slate-700 text-slate-400 border border-slate-700/60'
              }`}
            >
              {callInfo.isCamEnabled ? (
                <>
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden xs:inline">Camera</span>
                </>
              ) : (
                <>
                  <VideoOff className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">No Video</span>
                </>
              )}
            </button>

            {/* Screen Share Toggle */}
            <button
              id="miniplayer-toggle-screenshare-btn"
              onClick={onToggleScreenShare}
              title={callInfo.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                callInfo.isScreenSharing
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{callInfo.isScreenSharing ? 'Sharing' : 'Share'}</span>
            </button>

            {/* Return to Full Call */}
            <button
              id="miniplayer-expand-call-btn"
              onClick={onReturnToCall}
              title="Return to Full Call View"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Call</span>
            </button>

            {/* Leave Call */}
            <button
              id="miniplayer-leave-call-btn"
              onClick={onLeaveCall}
              title="Leave Video Call"
              className="p-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white transition cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>

            {/* Collapse / Minimize pill button */}
            <button
              onClick={() => setIsCollapsed(true)}
              title="Minimize to Floating Dot"
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
