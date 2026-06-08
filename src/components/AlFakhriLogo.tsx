/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export default function AlFakhriLogo({ className = "h-12" }: { className?: string }) {
  return (
    <div id="alfakhri-brand-logo" className={`flex items-center space-x-3.5 select-none ${className}`}>
      {/* Elegant bilingual typography left of emblem */}
      <div className="flex flex-col text-left justify-center">
        <span 
          style={{ fontFamily: '"Inter", "Arial", sans-serif', direction: 'rtl' }} 
          className="text-right text-base md:text-lg font-bold text-[#0e5697] leading-tight tracking-wide"
        >
          مجموعة الفاخري
        </span>
        <span 
          className="text-[10px] md:text-xs font-extrabold text-[#0e5697] tracking-[0.22em] leading-none uppercase mt-0.5"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          ALFAKHRI GROUP
        </span>
      </div>

      {/* Exquisite Arabic Calligraphy Crest Symbol */}
      <svg 
        viewBox="0 0 160 160" 
        className="h-10 w-10 md:h-12 md:w-12 shrink-0 drop-shadow-5xs"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Calligraphy Circular Enclosing Ring Accent */}
        <circle cx="80" cy="80" r="74" stroke="#0e5697" strokeWidth="2" strokeDasharray="3 3 shrink-0" opacity="0.3" />
        
        {/* Dynamic Stylized Swoops representing Arabic Calligraphy letters (Al-Fakhri style) */}
        <path 
          d="M102,30 C125,30 142,48 142,75 C142,108 112,138 78,138 C56,138 32,124 24,102 C20,90 22,78 32,70 C38,65 46,65 52,70 C58,75 58,85 52,91 C43,100 45,116 62,122 C79,128 108,122 122,100 C132,84 130,58 115,44 C104,34 90,34 82,42 C74,50 78,65 89,72 C98,78 102,88 98,98 C94,107 82,112 72,106 C60,99 58,82 66,70 C76,55 92,45 102,30 Z" 
          fill="#0e5697" 
        />
        
        {/* Elegant Central Diacritic Diamond Accent representing Group Name dots */}
        <path 
          d="M108,18 L116,28 L108,38 L100,28 Z" 
          fill="#0e5697" 
        />
        
        {/* Second complementary calligraphy curl representing the Arabic letter 'Yaa' lower tail */}
        <path 
          d="M38,105 C38,124 55,136 75,136 C60,136 46,128 44,115 C43,108 46,102 52,102 C58,102 62,108 61,114 C59,122 66,128 78,128 C82,124 81,118 76,112 C71,106 72,96 79,90 C86,84 94,84 98,90 C101,95 98,102 93,104 C84,108 72,104 68,95 C66,91 68,85 73,81" 
          stroke="#0e5697" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
        />

        {/* Small subtle accent diamond in center-bottom */}
        <path 
          d="M62,110 L66,115 L62,120 L58,115 Z" 
          fill="#0e5697" 
        />
      </svg>
    </div>
  );
}
