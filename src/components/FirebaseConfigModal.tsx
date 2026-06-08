/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Cloud, CloudOff, Eye, EyeOff, Save, CheckCircle, Info } from 'lucide-react';
import { CustomFirebaseConfig } from '../types';

interface FirebaseConfigModalProps {
  config: CustomFirebaseConfig | null;
  onSave: (newConfig: CustomFirebaseConfig | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_BLANK_CONFIG: CustomFirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export default function FirebaseConfigModal({
  config,
  onSave,
  isOpen,
  onClose,
}: FirebaseConfigModalProps) {
  const [formConfig, setFormConfig] = useState<CustomFirebaseConfig>(() => {
    if (config) return { ...config };
    return { ...DEFAULT_BLANK_CONFIG };
  });

  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormConfig((prev) => ({
      ...prev,
      [name]: value.trim(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic verification
    const isBlank = Object.values(formConfig).every((val) => val === '');
    if (isBlank) {
      onSave(null);
    } else {
      onSave(formConfig);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    setFormConfig({ ...DEFAULT_BLANK_CONFIG });
    onSave(null);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div id="firebase-config-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div id="firebase-config-card" className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-indigo-400" />
            <div>
              <h3 className="font-sans font-medium text-lg leading-tight">Firebase Cloud Integration</h3>
              <p className="text-xs text-slate-400 font-mono">Firestore Configuration Setup</p>
            </div>
          </div>
          <button
            id="close-config-button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm hover:bg-slate-800 px-3 py-1.5 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-start space-x-3">
            <Info className="h-5 w-5 text-indigo-600 shrink-0 select-none mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold block text-slate-800 mb-0.5">How this works:</span>
              By default, this applet runs in <strong className="text-emerald-700">Sandbox Mode (Local Storage)</strong>. You can immediately assign routes, map drives, and log active items offline. 
              To sync in real-time across multiple browsers, drop your web app credentials below.
              <span className="block mt-1 text-slate-500 italic">💡 Tip: You can also manage these permanently via <strong>AI Studio Workspace Secrets (Settings &gt; Secrets / Environment Variables)</strong> under the <code className="bg-slate-100 px-1 rounded">VITE_FIREBASE_API_KEY</code>, etc. variables.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-mono text-slate-500 font-medium uppercase tracking-wider mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  id="config-apiKey"
                  type={showKey ? 'text' : 'password'}
                  name="apiKey"
                  value={formConfig.apiKey}
                  onChange={handleChange}
                  placeholder="AIzaSyA1..."
                  className="w-full text-sm font-mono px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 font-medium uppercase tracking-wider mb-1">
                Project ID
              </label>
              <input
                id="config-projectId"
                type="text"
                name="projectId"
                value={formConfig.projectId}
                onChange={handleChange}
                placeholder="my-truck-company-101"
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 font-medium uppercase tracking-wider mb-1">
                Auth Domain
              </label>
              <input
                id="config-authDomain"
                type="text"
                name="authDomain"
                value={formConfig.authDomain}
                onChange={handleChange}
                placeholder="projectId.firebaseapp.com"
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 font-medium uppercase tracking-wider mb-1">
                Storage Bucket
              </label>
              <input
                id="config-storageBucket"
                type="text"
                name="storageBucket"
                value={formConfig.storageBucket}
                onChange={handleChange}
                placeholder="projectId.appspot.com"
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 font-medium uppercase tracking-wider mb-1">
                Messaging Sender ID
              </label>
              <input
                id="config-messagingSenderId"
                type="text"
                name="messagingSenderId"
                value={formConfig.messagingSenderId}
                onChange={handleChange}
                placeholder="8681203498"
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-mono text-slate-500 font-medium uppercase tracking-wider mb-1">
                App ID
              </label>
              <input
                id="config-appId"
                type="text"
                name="appId"
                value={formConfig.appId}
                onChange={handleChange}
                placeholder="1:8681203498:web:fb210ae3..."
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              id="clear-config-button"
              onClick={handleClear}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1.5 hover:bg-rose-50 rounded-lg transition-colors"
            >
              Disconnect & Clear
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                id="cancel-config-button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                id="submit-config-button"
                disabled={saveSuccess}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:bg-emerald-600 disabled:cursor-not-allowed shadow-sm"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Connected!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Connect & Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
