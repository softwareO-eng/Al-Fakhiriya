/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Truck, Driver } from '../types';
import { Route, ClipboardList, MapPin, Navigation, ArrowRight } from 'lucide-react';

interface TripAssignmentModalProps {
  driver: Driver;
  truck: Truck;
  isOpen: boolean;
  onConfirm: (from: string, to: string) => void;
  onCancel: () => void;
  id?: string;
}

export default function TripAssignmentModal({
  driver,
  truck,
  isOpen,
  onConfirm,
  onCancel,
  id = 'trip-assignment-modal',
}: TripAssignmentModalProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from.trim()) {
      setError('Pickup location is required.');
      return;
    }
    if (!to.trim()) {
      setError('Dropoff location is required.');
      return;
    }
    setError('');
    onConfirm(from.trim(), to.trim());
    setFrom('');
    setTo('');
  };

  return (
    <div id={`${id}-overlay`} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div id={`${id}-card`} className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Route className="h-5 w-5 text-indigo-400" />
            <span className="font-sans font-medium text-base">New Cargo Dispatch Assignment</span>
          </div>
          <button
            id="close-assignment-modal"
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Summary badging of active choices */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            <div>
              <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Selected Fleet Truck</span>
              <span className="block text-sm font-semibold text-slate-800 mt-1 truncate">{truck.id}</span>
              <span className="block text-xs text-slate-500 truncate">{truck.name}</span>
            </div>
            <div>
              <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Assigned Driver</span>
              <span className="block text-sm font-semibold text-slate-800 mt-1 truncate">{driver.name}</span>
              <span className="block text-xs text-slate-500 truncate">{driver.licenseNumber}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                <span>Pickup From Location</span>
              </label>
              <input
                id="trip-input-from"
                type="text"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (error) setError('');
                }}
                required
                placeholder="e.g. Austin Warehouse A (Austin, TX)"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex justify-center select-none py-1">
              <div className="bg-slate-100 p-1.5 rounded-full border border-slate-200/40 text-slate-400">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Navigation className="h-3.5 w-3.5 text-emerald-500" />
                <span>Dropoff Destination Location</span>
              </label>
              <input
                id="trip-input-to"
                type="text"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (error) setError('');
                }}
                required
                placeholder="e.g. Port of Los Angeles (San Pedro, CA)"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>
          </div>

          {error && (
            <div id="trip-assignment-error" className="text-xs bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg flex items-center space-x-2">
              <span className="font-semibold">⚠️ Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              id="trip-assignment-cancel"
              onClick={onCancel}
              className="px-4.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="trip-assignment-submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center space-x-1.5"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Confirm & Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
