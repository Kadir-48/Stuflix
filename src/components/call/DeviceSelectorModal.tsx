import React, { useState, useEffect } from 'react';
import { Room } from 'livekit-client';
import { Settings, Mic, Video, Volume2, X, Check, RefreshCw } from 'lucide-react';

interface DeviceSelectorModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSelectorModal: React.FC<DeviceSelectorModalProps> = ({ room, isOpen, onClose }) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadDevices = async () => {
    try {
      // Check device permissions
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioIn = devices.filter(d => d.kind === 'audioinput');
      const videoIn = devices.filter(d => d.kind === 'videoinput');
      const audioOut = devices.filter(d => d.kind === 'audiooutput');

      setAudioInputs(audioIn);
      setVideoInputs(videoIn);
      setAudioOutputs(audioOut);

      // Check room's current active devices if room exists
      if (room) {
        // Room active device
        const activeMic = room.getActiveDevice('audioinput');
        if (activeMic) setSelectedAudioInput(activeMic);
        else if (audioIn.length > 0) setSelectedAudioInput(audioIn[0].deviceId);

        const activeCam = room.getActiveDevice('videoinput');
        if (activeCam) setSelectedVideoInput(activeCam);
        else if (videoIn.length > 0) setSelectedVideoInput(videoIn[0].deviceId);

        const activeSpeaker = room.getActiveDevice('audiooutput');
        if (activeSpeaker) setSelectedAudioOutput(activeSpeaker);
        else if (audioOut.length > 0) setSelectedAudioOutput(audioOut[0].deviceId);
      }
    } catch (err) {
      console.warn('Device enumeration warning:', err);
      setPermissionGranted(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen, room]);

  const handleAudioInputChange = async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice('audioinput', deviceId);
        setFeedbackMsg('Microphone changed successfully');
        setTimeout(() => setFeedbackMsg(null), 2500);
      } catch (e: any) {
        console.error('Failed to switch microphone:', e);
      }
    }
  };

  const handleVideoInputChange = async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice('videoinput', deviceId);
        setFeedbackMsg('Camera changed successfully');
        setTimeout(() => setFeedbackMsg(null), 2500);
      } catch (e: any) {
        console.error('Failed to switch camera:', e);
      }
    }
  };

  const handleAudioOutputChange = async (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice('audiooutput', deviceId);
        setFeedbackMsg('Audio output changed successfully');
        setTimeout(() => setFeedbackMsg(null), 2500);
      } catch (e: any) {
        console.error('Failed to switch speaker:', e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div id="device-settings-modal-backdrop" className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div id="device-settings-modal" className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Audio & Video Devices</h3>
              <p className="text-xs text-slate-400">Select input and output hardware for calls</p>
            </div>
          </div>
          <button
            id="close-device-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {feedbackMsg && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Check className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Microphone */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Mic className="w-4 h-4 text-slate-400" />
              <span>Microphone (Audio Input)</span>
            </label>
            <select
              id="select-microphone-device"
              value={selectedAudioInput}
              onChange={(e) => handleAudioInputChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              {audioInputs.length === 0 ? (
                <option value="">Default Microphone</option>
              ) : (
                audioInputs.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Microphone ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Camera */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Video className="w-4 h-4 text-slate-400" />
              <span>Camera (Video Input)</span>
            </label>
            <select
              id="select-camera-device"
              value={selectedVideoInput}
              onChange={(e) => handleVideoInputChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              {videoInputs.length === 0 ? (
                <option value="">Default Camera</option>
              ) : (
                videoInputs.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Speaker */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <span>Speakers (Audio Output)</span>
            </label>
            <select
              id="select-speaker-device"
              value={selectedAudioOutput}
              onChange={(e) => handleAudioOutputChange(e.target.value)}
              disabled={audioOutputs.length === 0}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
            >
              {audioOutputs.length === 0 ? (
                <option value="">System Default Audio Output</option>
              ) : (
                audioOutputs.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Speaker ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
            {audioOutputs.length === 0 && (
              <p className="text-[11px] text-slate-500 italic">
                Browser speaker switching is handled by OS audio default on this device.
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
          <button
            id="refresh-devices-btn"
            onClick={loadDevices}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rescan Devices</span>
          </button>
          <button
            id="done-device-settings-btn"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
