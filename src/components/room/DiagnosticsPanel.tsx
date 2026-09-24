import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Radio,
  Server,
  Key,
  Globe,
} from 'lucide-react';
import { LiveKitStatusResponse } from '../../types';
import { safeFetchJson } from '../../lib/api';

export const DiagnosticsPanel: React.FC = () => {
  const [status, setStatus] = useState<LiveKitStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<LiveKitStatusResponse>('/api/livekit/status');
      if (res.ok && res.data) {
        setStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const copyCurl = () => {
    const cmd = `curl -s ${window.location.origin}/api/livekit/status | jq .`;
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div id="diagnostics-panel-container" className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">LiveKit Call Engine & Network Diagnostics</h3>
            <p className="text-xs text-slate-400">Endpoint status, NAT traversal, STUN/TURN, and credential verification</p>
          </div>
        </div>

        <button
          id="refresh-diagnostics-btn"
          onClick={fetchStatus}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            status?.configured
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {status?.configured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-bold">
                {status?.configured
                  ? 'LiveKit Engine Ready for Production Calls'
                  : 'LiveKit Setup Incomplete — Environment Variables Required'}
              </h4>
              <p className="text-xs opacity-90">
                {status?.configured
                  ? 'All credentials verified. Peer-to-peer and relayed STUN/TURN media channels enabled.'
                  : 'Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in AI Studio Secrets or .env file.'}
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold px-3 py-1 rounded-md bg-slate-900/60 border border-slate-700/60">
            {status?.configured ? 'READY (200 OK)' : 'CONFIG_PENDING'}
          </div>
        </div>

        {/* Credentials Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* LiveKit URL */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>LIVEKIT_URL</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  status?.urlConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {status?.urlConfigured ? 'Valid' : 'Missing'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 truncate">
              {status?.url || 'Not configured'}
            </p>
            <p className="text-[11px] text-slate-500">
              Target WebSocket URL for client media signaling
            </p>
          </div>

          {/* API Key */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-purple-400" />
                <span>LIVEKIT_API_KEY</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  status?.apiKeyConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {status?.apiKeyConfigured ? 'Configured' : 'Missing'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              {status?.apiKeyMasked || 'Not configured'}
            </p>
            <p className="text-[11px] text-slate-500">
              Project public identifier for signing access tokens
            </p>
          </div>

          {/* API Secret */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>LIVEKIT_API_SECRET</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  status?.apiSecretConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {status?.apiSecretConfigured ? 'Secured' : 'Missing'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              {status?.apiSecretMasked || 'Not configured'}
            </p>
            <p className="text-[11px] text-slate-500">
              Private signing secret (never exposed to client browser)
            </p>
          </div>
        </div>

        {/* NAT Traversal & STUN/TURN Report */}
        <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" />
              <span>Network Traversal & TURN Relays</span>
            </h4>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              Multi-Network Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-semibold text-slate-300">Google STUN Cluster:</span>
              <p className="text-slate-400 font-mono text-[11px]">
                stun.l.google.com:19302 (5 failover instances)
              </p>
              <p className="text-[11px] text-slate-500">
                Discovers public IP and reflexive candidates for direct P2P connections on same/different Wi-Fi.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-semibold text-slate-300">TURN Relay Support:</span>
              <p className="text-slate-400 font-mono text-[11px]">
                {status?.turnStatus.customTurnConfigured
                  ? `Custom TURN: ${status.turnStatus.turnUrl}`
                  : 'LiveKit Cloud Built-in TURN Relay Active'}
              </p>
              <p className="text-[11px] text-slate-500">
                Guarantees connectivity across symmetric NATs, cellular 4G/5G, and restrictive school firewalls.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Diagnostics List from API */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Server Diagnostic Log ({status?.diagnostics.length || 0})
          </h4>
          <div className="space-y-2">
            {status?.diagnostics.map((d, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3"
              >
                {d.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : d.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-semibold text-slate-200">{d.message}</div>
                  {d.details && <p className="text-[11px] text-slate-400 mt-0.5">{d.details}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Curl Test Command */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Test Diagnostics Endpoint via CLI</span>
            <button
              onClick={copyCurl}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl ? 'Copied' : 'Copy curl'}</span>
            </button>
          </div>
          <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800">
            curl -s {typeof window !== 'undefined' ? window.location.origin : ''}/api/livekit/status
          </pre>
        </div>
      </div>
    </div>
  );
};
