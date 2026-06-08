/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin } from 'lucide-react';

interface MapDirectionLinkProps {
  from: string;
  to: string;
  className?: string;
  id?: string;
}

export default function MapDirectionLink({ from, to, className = '', id }: MapDirectionLinkProps) {
  const origin = encodeURIComponent(from);
  const destination = encodeURIComponent(to);
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

  return (
    <a
      id={id || `map-dir-link-${origin}-${destination}`}
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-full text-[11px] font-mono font-medium transition-all ${className}`}
    >
      <MapPin className="h-3 w-3" />
      <span>View Directions</span>
    </a>
  );
}
