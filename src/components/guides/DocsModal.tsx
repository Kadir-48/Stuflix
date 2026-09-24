import React, { useState } from 'react';
import {
  BookOpen,
  FolderTree,
  FileCode,
  Key,
  Server,
  Network,
  CheckSquare,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'folder' | 'env' | 'livekit' | 'deployment' | 'crossnetwork' | 'checklist'
  >('livekit');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Stuflix Engineering & Setup Guide</h2>
              <p className="text-xs text-slate-400">Production LiveKit setup, cross-network traversal, and verification checklist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-800 bg-slate-900/60 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('livekit')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'livekit'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>4. LiveKit Setup Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('crossnetwork')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'crossnetwork'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>6. Cross-Network Testing</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'checklist'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>7. Verification Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'env'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>3. Environment Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('deployment')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'deployment'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>5. Deployment Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('folder')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'folder'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>2. Folder Structure</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm leading-relaxed space-y-6">
          {/* TAB: LIVEKIT SETUP GUIDE */}
          {activeTab === 'livekit' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                <h3 className="text-base font-bold mb-1">Production LiveKit Requirements</h3>
                <p className="text-xs leading-normal">
                  Stuflix requires production LiveKit credentials. As specified by protocol:
                  <strong className="text-white"> demo credentials (demo.livekit.cloud, devkey, secret) are strictly forbidden</strong> and rejected by the server token endpoint.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100">Step 1: Create a Free LiveKit Cloud Project</h4>
                <ol className="list-decimal pl-5 text-xs space-y-1.5 text-slate-300">
                  <li>Visit <a href="https://cloud.livekit.io" target="_blank" rel="noreferrer" className="text-blue-400 underline">https://cloud.livekit.io</a> and sign in with GitHub or Google.</li>
                  <li>Create a new Project (e.g. "Stuflix-Production").</li>
                  <li>Navigate to <strong>Project Settings → Keys</strong>.</li>
                  <li>Generate a new API Key & Secret pair.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-100">Step 2: Required Environment Variables</h4>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1 relative">
                  <button
                    onClick={() => copyText('LIVEKIT_URL=wss://your-project.livekit.cloud\nLIVEKIT_API_KEY=APIxxxxxxxxx\nLIVEKIT_API_SECRET=sec_xxxxxxxxx\nLIVEKIT_TURN_URL=\nLIVEKIT_TURN_USERNAME=\nLIVEKIT_TURN_CREDENTIAL=', 'env-snippet')}
                    className="absolute top-2.5 right-2.5 text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
                  >
                    {copiedSection === 'env-snippet' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'env-snippet' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <p><span className="text-blue-400">LIVEKIT_URL</span>="wss://your-project.livekit.cloud"</p>
                  <p><span className="text-purple-400">LIVEKIT_API_KEY</span>="APIxxxxxxxxx"</p>
                  <p><span className="text-emerald-400">LIVEKIT_API_SECRET</span>="sec_xxxxxxxxx"</p>
                  <p className="text-slate-500"># Optional Custom TURN Server</p>
                  <p><span className="text-slate-400">LIVEKIT_TURN_URL</span>=""</p>
                  <p><span className="text-slate-400">LIVEKIT_TURN_USERNAME</span>=""</p>
                  <p><span className="text-slate-400">LIVEKIT_TURN_CREDENTIAL</span>=""</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-100">Step 3: Self-Hosted Alternative (Docker)</h4>
                <p className="text-xs text-slate-400">If hosting on your own Linux / VPS instance:</p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                  docker run --rm -it -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --keys "YOUR_KEY: YOUR_SECRET"
                </div>
              </div>
            </div>
          )}

          {/* TAB: CROSS-NETWORK TESTING */}
          {activeTab === 'crossnetwork' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <h3 className="text-base font-bold mb-1">Cross-Network Traversal Architecture</h3>
                <p>
                  Study calls are engineered to work seamlessly across heterogeneous networks without dropped video or one-way audio.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200">1. Same Wi-Fi (LAN)</h4>
                  <p className="text-slate-400">
                    Direct local host candidate matching via WebRTC ICE. Minimal latency (&lt;10ms) and zero packet loss.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200">2. Different Wi-Fi Networks</h4>
                  <p className="text-slate-400">
                    Google STUN servers (<code>stun.l.google.com:19302</code>) resolve public WAN endpoints for direct UDP traversal across consumer NATs.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200">3. Mobile Hotspot</h4>
                  <p className="text-slate-400">
                    Carrier-grade NAT (CGNAT) handling via LiveKit Cloud TURN relay (fallback automatically selected by ICE).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-200">4. Cellular 4G/5G Network</h4>
                  <p className="text-slate-400">
                    Dynamic bitrates and simulcast (<code>dynacast</code>, <code>adaptiveStream</code>, and Opus RED redundancy) protect against packet loss.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-200">How to Verify Cross-Network Functionality:</h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Open Stuflix on a laptop connected to Home/Campus Wi-Fi and enter a study room.</li>
                  <li>Open Stuflix on a mobile phone with Wi-Fi disabled (running purely on 4G/5G cellular data).</li>
                  <li>Enter the room using the same Room Code (e.g. <code>ALG202</code>).</li>
                  <li>Join the Study Call from both devices. Verify bi-directional audio, video tiles, and screen sharing.</li>
                  <li>Disconnect Wi-Fi on the laptop and tether to phone hotspot. Verify call automatically recovers via exponential backoff reconnect.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: VERIFICATION CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Study Call System Verification Checklist</h3>
              <p className="text-xs text-slate-400">
                10-point production readiness checklist verifying stability, audio playback, and cross-browser handling:
              </p>

              <div className="space-y-2 text-xs">
                {[
                  {
                    title: '1. Production Credentials Enforcement',
                    desc: 'Rejects demo credentials (wss://demo.livekit.cloud, devkey, secret). Validates LIVEKIT_URL, API_KEY, and API_SECRET.',
                    checked: true,
                  },
                  {
                    title: '2. Persistent Student Session IDs',
                    desc: 'Uses stable studentId mapping (stu_*) in localStorage, preventing duplicate participants and session collisions.',
                    checked: true,
                  },
                  {
                    title: '3. Disconnect Grace Period (15s)',
                    desc: 'Server applies a 15-second grace period timer before removing disconnected participants, preventing ghost leaves during network blips.',
                    checked: true,
                  },
                  {
                    title: '4. Video Stability & Dynacast',
                    desc: 'adaptiveStream and dynacast enabled with simulcast layers (180p, 360p, 720p), preventing video dropping after 5–10 seconds.',
                    checked: true,
                  },
                  {
                    title: '5. Cross-Browser Audio (startAudio & Autoplay)',
                    desc: 'AudioPlaybackStatus listener automatically detects autoplay restrictions and presents an interactive banner to unlock Web Audio.',
                    checked: true,
                  },
                  {
                    title: '6. RoomAudioRenderer Implementation',
                    desc: 'Attaches remote audio tracks to DOM HTMLAudioElements, verifying cross-browser microphone streaming.',
                    checked: true,
                  },
                  {
                    title: '7. Hardware Device Switching',
                    desc: 'Supports switching active microphones, webcams, and speakers during active calls via navigator.mediaDevices.',
                    checked: true,
                  },
                  {
                    title: '8. Screen Sharing with System Audio',
                    desc: 'Native getDisplayMedia integration allows sharing windows, tabs, or full screen alongside live webcam feed.',
                    checked: true,
                  },
                  {
                    title: '9. STUN & TURN NAT Traversal',
                    desc: 'Configured with 5 Google STUN failovers and LiveKit Cloud / custom TURN relays for cellular and hotspot routing.',
                    checked: true,
                  },
                  {
                    title: '10. Diagnostic Endpoint (/api/livekit/status)',
                    desc: 'Live endpoint exposes URL validation, key masking, TURN relay status, and active diagnostics.',
                    checked: true,
                  },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">{item.title}</h4>
                      <p className="text-slate-400 mt-0.5 text-[11px] leading-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ENVIRONMENT SETUP */}
          {activeTab === 'env' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Environment Configuration (.env.example)</h3>
              <p className="text-xs text-slate-400">
                The application reads all secrets on the Express server side. Never prefix secrets with VITE_ to keep them confidential.
              </p>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`# AI Studio Injected Variables
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"

# LiveKit Production Study Call Configuration
LIVEKIT_URL=wss://myproject.livekit.cloud
LIVEKIT_API_KEY=APIMyProductionKey
LIVEKIT_API_SECRET=sec_MySecretKey987654321

# Optional Custom TURN Relay
LIVEKIT_TURN_URL=
LIVEKIT_TURN_USERNAME=
LIVEKIT_TURN_CREDENTIAL=`}
              </pre>
            </div>
          )}

          {/* TAB: DEPLOYMENT GUIDE */}
          {activeTab === 'deployment' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Production Deployment (Cloud Run / Node.js)</h3>
              <p className="text-xs text-slate-400">
                Stuflix builds as a bundled single-container full-stack application using Vite + esbuild.
              </p>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-200">1. Production Build Command</h4>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-slate-300 border border-slate-800">
                  npm run build
                </div>
                <p className="text-slate-400 text-[11px]">
                  Builds client assets into <code>dist/</code> and bundles <code>server.ts</code> into a CommonJS bundle at <code>dist/server.cjs</code>.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-200">2. Production Start Command</h4>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-slate-300 border border-slate-800">
                  npm start
                </div>
                <p className="text-slate-400 text-[11px]">
                  Launches <code>node dist/server.cjs</code> bound to host <code>0.0.0.0</code> and port <code>3000</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB: FOLDER STRUCTURE */}
          {activeTab === 'folder' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Project Folder Structure</h3>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
{`Stuflix/
├── .env.example                     # Environment declaration (LiveKit + App)
├── index.html                       # HTML5 entry with synced metadata
├── metadata.json                    # Permissions (camera, mic, display-capture)
├── package.json                     # LiveKit client/server SDKs, Express, React
├── server.ts                        # Full-stack server, LiveKit token API, WS room engine
├── tsconfig.json                    # Strict TypeScript configuration
├── vite.config.ts                   # Vite build configuration with Tailwind
└── src/
    ├── types.ts                     # Shared interfaces (Room, Participant, Chat, LiveKit)
    ├── main.tsx                     # React 19 application mount
    ├── App.tsx                      # Root coordinator with routing & room navigation
    ├── index.css                    # Tailwind CSS imports & base styles
    ├── lib/
    │   ├── livekitConfig.ts         # Google STUN servers, dynacast, adaptiveStream
    │   └── session.ts               # Persistent studentId, name, avatar storage
    ├── hooks/
    │   └── useRealtimeRoom.ts       # Real-time WebSocket room sync & auto-save
    └── components/
        ├── Navigation.tsx           # Global header with student session profile
        ├── Dashboard.tsx            # Study rooms directory, code joiner, room creator
        ├── RoomView.tsx             # Room container with study tabs
        ├── call/
        │   ├── StudyCallRoom.tsx    # LiveKit video/audio calls, screen share, autoplay
        │   ├── ParticipantTile.tsx  # Video renderer, mute status, connection quality
        │   ├── DeviceSelectorModal.tsx # Microphone, camera, speaker selector
        │   └── CallStatsModal.tsx   # ICE restart, diagnostics, WebRTC stats
        ├── room/
        │   ├── NotesEditor.tsx      # Collaborative real-time notes & .md export
        │   ├── ChatPanel.tsx        # Real-time room messaging with typing indicators
        │   ├── FilesManager.tsx     # File uploads, shared resources, downloads
        │   ├── TimetableManager.tsx # Shared timetable with subject scheduler
        │   └── DiagnosticsPanel.tsx # LiveKit /api/livekit/status visual explorer
        └── guides/
            └── DocsModal.tsx        # Built-in 7-part engineering reference`}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">Stuflix v1.0 • Production Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
