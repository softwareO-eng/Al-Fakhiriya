/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Key, 
  RefreshCw, 
  HelpCircle, 
  ExternalLink,
  Info,
  Server,
  Database,
  Terminal
} from 'lucide-react';

interface KeyDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseConfigExists: boolean;
}

interface DiagnosticDetails {
  geminiConfigured: boolean;
  geminiWorks: boolean;
  geminiMessage: string;
  firebaseConfigured: boolean;
  firebaseEnv: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export default function KeyDiagnosticsModal({ isOpen, onClose, firebaseConfigExists }: KeyDiagnosticsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnosticDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/check-keys');
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to make contact with server diagnostics API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="diagnostics-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div id="diagnostics-modal-card" className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-base leading-tight">Key Authority & System Diagnostics</h3>
              <p className="text-xs text-slate-400 font-mono">Live API Checker & Integration Panel</p>
            </div>
          </div>
          <button
            id="close-diagnostics-button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm hover:bg-slate-800 px-3 py-1.5 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Quick status overview */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-start space-x-3">
            <Server className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold block text-slate-800 mb-0.5">Integration Checker:</span>
              This diagnostics board runs standard validation checks on the server-side environment parameters and client-side database connections to ensure correct co-pilot and real-time syncing configuration.
            </div>
          </div>

          {/* Active Diagnostic Tests Results */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Live System Health Tests</h4>

            {loading ? (
              <div className="border border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center space-y-3 bg-slate-50/50">
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-mono">Pinging endpoints & verifying authorization states...</p>
              </div>
            ) : error ? (
              <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-xl flex items-start space-x-3 text-rose-800">
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Diagnostics Offline</p>
                  <p className="font-mono">{error}</p>
                </div>
              </div>
            ) : data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* GEMINI AI STATUS CARD */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                        <Key className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Gemini AI co-pilot</span>
                      </span>
                      {data.geminiWorks ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center space-x-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>WORKING</span>
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 flex items-center space-x-1">
                          <AlertCircle className="h-2.5 w-2.5" />
                          <span>INACTIVE</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Powers the floating morning safety brief and driver dispatcher matching assistant.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 font-mono text-[10px]">
                    <div className="flex justify-between mb-1 text-slate-400">
                      <span>Variable Name:</span>
                      <span className="text-slate-600 font-bold">GEMINI_API_KEY</span>
                    </div>
                    <div className="flex justify-between mb-1 text-slate-400">
                      <span>Status on Server:</span>
                      <span className={data.geminiConfigured ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                        {data.geminiConfigured ? "Configured" : "Not Found"}
                      </span>
                    </div>
                    <div className="mt-2 border-t border-slate-200 pt-2 text-slate-700 break-words font-sans italic text-[11px]">
                      {data.geminiWorks ? (
                        <span className="text-emerald-700 font-medium">✅ {data.geminiMessage}</span>
                      ) : (
                        <span className="text-slate-500 block leading-normal p-1 bg-yellow-50 text-yellow-800 text-[10px] rounded border border-yellow-100">
                          {data.geminiMessage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* FIREBASE SYNC STATUS CARD */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                        <Database className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Firebase Cloud Sync</span>
                      </span>
                      {(data.firebaseConfigured || firebaseConfigExists) ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center space-x-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>CONNECTED</span>
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100 flex items-center space-x-1">
                          <Info className="h-2.5 w-2.5" />
                          <span>SANDBOX MODE</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Enables real-time fleet synchronization, route matching logs and durable multiplayer updates.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 font-mono text-[10px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>VITE_FIREBASE_API_KEY:</span>
                      <span className="text-slate-800 truncate max-w-[130px] font-semibold">{data.firebaseEnv.apiKey}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>VITE_FIREBASE_PROJECT_ID:</span>
                      <span className="text-slate-800 truncate max-w-[130px] font-semibold">{data.firebaseEnv.projectId}</span>
                    </div>
                    <div className="pt-1.5 text-slate-500 leading-normal font-sans text-[11px] border-t border-slate-200 mt-2">
                      {(data.firebaseConfigured || firebaseConfigExists) ? (
                        <span className="text-emerald-700 font-medium">🔥 Cloud Synced: Active on all web clients.</span>
                      ) : (
                        <span className="text-slate-500">Using Sandbox Local Storage. Click "Config cloud" above to activate.</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : null}
          </div>

          {/* Detailed step-by-step Setup Guide */}
          <div className="border border-slate-250 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between font-mono text-xs">
              <span className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Quick Setup Guide to Add Keys</span>
              </span>
            </div>
            <div className="p-4 bg-slate-50/50 space-y-4">
              
              {/* Gemini step */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                  <span className="text-xs font-bold text-slate-800">Configure Gemini API Key:</span>
                </div>
                <div className="pl-7 text-xs text-slate-600 space-y-1.5">
                  <p>Get a free API key at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center space-x-0.5"><span>Google AI Studio</span> <ExternalLink className="h-3 w-3 inline" /></a>.</p>
                  <p>In AI Studio, look at the upper-right corner and click the <strong>Settings</strong> gear icon, then select <strong>Secrets / Environment Variables</strong>.</p>
                  <p>Add a new Secret with key <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[10px] font-mono font-semibold">GEMINI_API_KEY</code> and paste your key in the value box.</p>
                </div>
              </div>

              {/* Firebase step */}
              <div className="space-y-1 border-t border-slate-200/60 pt-3">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                  <span className="text-xs font-bold text-slate-800">Configure Firebase Sync Keys:</span>
                </div>
                <div className="pl-7 text-xs text-slate-600 space-y-1.5">
                  <p>Create a project at <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center space-x-0.5"><span>Firebase Console</span> <ExternalLink className="h-3 w-3 inline" /></a>.</p>
                  <p>Add a <strong>"Web" app</strong> to get your credentials, and enable <strong>Cloud Firestore</strong> database.</p>
                  <p>You can either configure them permanently by listing each variable as a Secret inside AI Studio Settings: (<code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">VITE_FIREBASE_API_KEY</code>, <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">VITE_FIREBASE_PROJECT_ID</code>, etc.), OR enter them by clicking <strong>"Config cloud"</strong> inside the app navigation bar.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={runDiagnostics}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 border border-slate-950 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Testing...' : 'Retest Live Connections'}</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-300 transition-colors"
          >
            Close Diagnostics
          </button>
        </div>

      </div>
    </div>
  );
}
