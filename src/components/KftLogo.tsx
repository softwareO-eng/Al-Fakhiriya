/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Upload, RotateCcw } from 'lucide-react';

interface KftLogoProps {
  className?: string;
  showText?: boolean;
}

const STORAGE_KEY = 'kft_brand_custom_logo_v1';

/**
 * KFT HEAVY TRANSPORT Brand Logo Component
 * - Authentic vector rendering of KFT Heavy Transport with slanting letterforms and highway sweep.
 * - Supports direct image upload so dispatchers can use their exact logo file with local persistence.
 */
export default function KftLogo({ className = "h-12", showText = true }: KftLogoProps) {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCustomLogoUrl(saved);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomLogoUrl(result);
          try {
            localStorage.setItem(STORAGE_KEY, result);
          } catch {
            // Ignore storage restrictions
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomLogoUrl(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage restrictions
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      id="kft-brand-logo-container"
      className={`relative group inline-flex items-center select-none cursor-pointer ${className}`}
      title="KFT Heavy Transport (Click to upload your custom logo image)"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {customLogoUrl ? (
        <div className="relative h-full flex items-center">
          <img
            src={customLogoUrl}
            alt="KFT Heavy Transport"
            className="h-full w-auto max-h-14 object-contain"
          />
          <button
            type="button"
            title="Reset to vector logo"
            onClick={handleResetLogo}
            className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-600 cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        /* High-Definition Authentic Vector Logo */
        <div className="relative h-full flex items-center">
          <svg
            viewBox="0 0 460 115"
            className="h-full w-auto max-h-14 drop-shadow-xs"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="KFT Heavy Transport"
          >
            <defs>
              {/* Primary Transport Deep Navy Gradient */}
              <linearGradient id="kftPrimaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Bold Highway Asphalt Gradient */}
              <linearGradient id="kftRoadSurface" x1="0%" y1="70%" x2="100%" y2="30%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* Highway Edge Chrome / White Trim */}
              <linearGradient id="kftChromeTrim" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="30%" stopColor="#f1f5f9" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              {/* Letter Depth Shadow */}
              <filter id="kftCrispDepth" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#091322" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Main Brand Elements */}
            <g filter="url(#kftCrispDepth)">
              {/* Group with uniform dynamic forward slant angle (-14 deg) */}
              <g transform="skewX(-14) translate(28, 0)">
                {/* ========== LETTER 'K' ========== */}
                <rect x="20" y="10" width="28" height="74" rx="2" fill="url(#kftPrimaryGradient)" />
                <path
                  d="M 44 48 L 86 10 L 118 10 L 64 54 Z"
                  fill="url(#kftPrimaryGradient)"
                />
                <path
                  d="M 52 44 L 102 84 L 132 84 L 74 38 Z"
                  fill="url(#kftPrimaryGradient)"
                />

                {/* ========== LETTER 'F' ========== */}
                <rect x="144" y="10" width="28" height="74" rx="2" fill="url(#kftPrimaryGradient)" />
                <path
                  d="M 168 10 L 250 10 L 244 28 L 168 28 Z"
                  fill="url(#kftPrimaryGradient)"
                />
                <path
                  d="M 168 40 L 232 40 L 227 56 L 168 56 Z"
                  fill="url(#kftPrimaryGradient)"
                />

                {/* ========== LETTER 'T' ========== */}
                <path
                  d="M 252 10 L 372 10 L 366 28 L 258 28 Z"
                  fill="url(#kftPrimaryGradient)"
                />
                <rect x="298" y="26" width="28" height="58" rx="2" fill="url(#kftPrimaryGradient)" />
              </g>

              {/* ========== DYNAMIC HIGHWAY HIGH-SPEED ROAD ========== */}
              {/* Clean Relief Border to prevent visual clashing */}
              <path
                d="M 14 82 Q 185 68 438 32 L 436 44 Q 185 80 12 94 Z"
                fill="#ffffff"
                opacity="0.98"
              />

              {/* Top Chrome Edge / Guardrail */}
              <path
                d="M 14 82 Q 185 68 438 32"
                stroke="url(#kftChromeTrim)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Asphalt Road Body */}
              <path
                d="M 14 82 Q 185 68 438 32 L 436 43 Q 185 79 13 93 Z"
                fill="url(#kftRoadSurface)"
              />

              {/* High-visibility Yellow Highway Dashed Lane Divider */}
              <path
                d="M 18 87 Q 185 73 434 37"
                stroke="#facc15"
                strokeWidth="2"
                strokeDasharray="12 6"
                strokeLinecap="butt"
              />

              {/* Bottom Guardrail Edge */}
              <path
                d="M 13 93 Q 185 79 436 43"
                stroke="url(#kftChromeTrim)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Front Speed Arrow Flare */}
              <path
                d="M 436 31 L 446 38 L 434 44 Z"
                fill="#facc15"
              />
            </g>

            {/* ========== "HEAVY TRANSPORT" SLOGAN ========== */}
            {showText && (
              <g>
                <line x1="30" y1="104" x2="90" y2="104" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="370" y1="104" x2="430" y2="104" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

                <text
                  x="230"
                  y="108"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  fontSize="15"
                  fontWeight="900"
                  letterSpacing="0.34em"
                  style={{ textTransform: 'uppercase', fontStyle: 'italic' }}
                >
                  HEAVY TRANSPORT
                </text>
              </g>
            )}
          </svg>

          {/* Quick upload hover tooltip */}
          <span className="absolute -bottom-2 right-0 bg-slate-900/90 text-white text-[9px] font-sans px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 shadow-xs">
            <Upload className="w-2.5 h-2.5" /> Upload image
          </span>
        </div>
      )}
    </div>
  );
}
