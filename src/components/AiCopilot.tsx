/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, X, RefreshCw, MessageSquare } from 'lucide-react';

interface AiCopilotProps {
  availableTrucks: any[];
  availableDrivers: any[];
  activeTrips: any[];
}

export default function AiCopilot({ availableTrucks, availableDrivers, activeTrips }: AiCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: "Hello! I am **AlFakhri Dispatch AI**. I am connected directly to your fleet dispatcher board. \n\nHow can I help you match available rigs, draft safety directives, or check route constraints today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isOpen]);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Append immediately
    setChatHistory((prev) => [...prev, { sender: 'user', text: messageText }]);
    setInput('');
    setLoading(true);

    try {
      // Collect current local state to pass as context
      const contextPayload = {
        timestamp: new Date().toISOString(),
        availableRigs: availableTrucks.map((t) => ({ id: t.id, name: t.name, status: t.status })),
        availablePilots: availableDrivers.map((d) => ({ name: d.name, license: d.licenseNumber, status: d.status })),
        activeRuns: activeTrips.map((tr) => ({ id: tr.id, rig: tr.truckId, pilot: tr.driverName, from: tr.from, to: tr.to })),
      };

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText,
          context: contextPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error Status ${res.status}`);
      }

      const json = await res.json();
      if (json.error) {
        setChatHistory((prev) => [
          ...prev,
          { sender: 'ai', text: `⚠️ **API Status:** ${json.error}` },
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { sender: 'ai', text: json.text || "No insights returned from AI." },
        ]);
      }
    } catch (e: any) {
      console.error(e);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `❌ **Connection Suspended.** Standard full-stack endpoint \`/api/assistant\` could not be reached. Ensure your \`GEMINI_API_KEY\` is active in settings.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Safe client-side markdown regex formatter
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, lineIndex) => {
      let isBullet = false;
      let displayLine = line;

      if (line.trim().startsWith('- ')) {
        isBullet = true;
        displayLine = line.trim().substring(2);
      } else if (line.trim().startsWith('* ')) {
        isBullet = true;
        displayLine = line.trim().substring(2);
      }

      const parts = [];
      let temp = displayLine;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;

      while ((match = boldRegex.exec(temp)) !== null) {
        if (match.index > lastIndex) {
          parts.push(temp.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < temp.length) {
        parts.push(temp.substring(lastIndex));
      }

      const inlineContent = parts.length > 0 ? parts : displayLine;

      if (isBullet) {
        return (
          <li key={lineIndex} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed mb-1">
            {inlineContent}
          </li>
        );
      }

      return (
        <p key={lineIndex} className="text-xs text-slate-700 leading-relaxed mb-1.5 min-h-[4px]">
          {inlineContent}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Spark Icon Bubble */}
      <button
        id="toggle-ai-copilot-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl shadow-xl flex items-center space-x-2 px-4 py-3 border border-slate-800 transition-all transform hover:scale-105 active:scale-95 z-40 group"
      >
        <div className="relative">
          <Bot className="h-5 w-5 text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <span className="text-xs font-semibold tracking-wide">AI Co-Pilot</span>
      </button>

      {/* Expandable Sidebar Dialogue Pane */}
      {isOpen && (
        <div
          id="ai-copilot-sidebar"
          className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
        >
          {/* Header section */}
          <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="bg-gradient-to-tr from-[#0e5697] to-[#1a6cb5] p-2 rounded-xl text-white">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-[10px] tracking-widest uppercase text-[#90c0ef]">AlFakhri Co-Pilot</h3>
                <h4 className="text-sm font-semibold truncate leading-tight">AI Dispatcher Assistant</h4>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800/85 p-2 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Active stats connected indicator strip */}
          <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>🛡️ Active Grounding Ready</span>
            <span className="text-[9px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
              {availableTrucks.length} Rigs | {availableDrivers.length} Pilots Free
            </span>
          </div>

          {/* Core Chat history messages pane */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-3xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="space-y-1">{formatMarkdown(msg.text)}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-3xs rounded-tl-none flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-500">Assessing fleet parameters...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick AI Presets Actions panel */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preset Copilot Actions</p>
            <div className="flex flex-col space-y-1.5">
              <button
                type="button"
                onClick={() => handleSend("Suggest optimal matches to assign our available rigs/trucks and safety-certified pilot drivers currently free")}
                disabled={loading}
                className="text-left text-[11px] text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-all truncate"
              >
                📊 Recommend Optimal Pilot Matchings
              </button>
              <button
                type="button"
                onClick={() => handleSend("Draft safety guidelines, hazard checks and rest stop recommendations for active dispatches")}
                disabled={loading}
                className="text-left text-[11px] text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-all truncate"
              >
                ❄️ Review Route Safety Constraints
              </button>
              <button
                type="button"
                onClick={() => handleSend("Review heavy shipping driver Hours of Service (HOS) rest time rules and compliance checks")}
                disabled={loading}
                className="text-left text-[11px] text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-all truncate"
              >
                ⏱️ Review HOS Rules & CDL Logging
              </button>
            </div>
          </div>

          {/* Message Prompt Submission element */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI dispatch copilot..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
