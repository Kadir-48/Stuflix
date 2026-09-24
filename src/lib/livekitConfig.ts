import { RoomOptions, RoomConnectOptions, VideoPresets, AudioPresets } from 'livekit-client';

export const GOOGLE_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
];

export function getRecommendedRoomOptions(): RoomOptions {
  return {
    // Dynamic stream management prevents video freezes and dropping after 5-10 seconds
    adaptiveStream: true,
    dynacast: true,
    stopLocalTrackOnUnpublish: true,
    disconnectOnPageLeave: true,
    
    // Video quality optimized for cross-network (Cellular / Hotspot / Wi-Fi)
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
    publishDefaults: {
      videoEncoding: VideoPresets.h720.encoding,
      videoSimulcastLayers: [
        VideoPresets.h180,
        VideoPresets.h360,
        VideoPresets.h720,
      ],
      audioPreset: AudioPresets.speech,
      dtx: true, // Discontinuous transmission saves bandwidth on mobile
      red: true, // Redundant Audio Data for packet loss concealment on cellular
    },
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
}

export function getRecommendedConnectOptions(customIceServers?: RTCIceServer[]): RoomConnectOptions {
  const iceServers: RTCIceServer[] = [
    { urls: GOOGLE_STUN_SERVERS },
    ...(customIceServers || []),
  ];

  return {
    autoSubscribe: true,
    peerConnectionTimeout: 15000,
    maxRetries: 5,
    rtcConfig: {
      iceServers,
      iceTransportPolicy: 'all', // Allows both STUN (direct p2p) and TURN (relay)
    },
  };
}
