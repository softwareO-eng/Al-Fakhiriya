/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Truck, Driver } from '../types';
import { Route, ClipboardList, MapPin, Navigation, ArrowRight, UserPlus, Users, X, ShieldCheck } from 'lucide-react';

interface TripAssignmentModalProps {
  driver: Driver;
  truck: Truck;
  coDriver?: Driver | null;
  availableDrivers?: Driver[];
  isOpen: boolean;
  onConfirm: (from: string, to: string, secondDriver?: Driver | null) => void;
  onCancel: () => void;
  id?: string;
}

export default function TripAssignmentModal({
  driver,
  truck,
  coDriver = null,
  availableDrivers = [],
  isOpen,
  onConfirm,
  onCancel,
  id = 'trip-assignment-modal',
}: TripAssignmentModalProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeCoDriver, setActiveCoDriver] = useState<Driver | null>(coDriver || null);
  const [showCoDriverPicker, setShowCoDriverPicker] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setActiveCoDriver(coDriver || null);
  }, [coDriver, isOpen]);

  if (!isOpen) return null;

  // Filter out the primary driver from potential co-drivers
  const candidateCoDrivers = availableDrivers.filter(
    (d) => d.id !== driver.id && d.status === 'Available'
  );

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
    onConfirm(from.trim(), to.trim(), activeCoDriver);
    setFrom('');
    setTo('');
    setActiveCoDriver(null);
    setShowCoDriverPicker(false);
  };

  return (
    <div id={`${id}-overlay`} className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div id={`${id}-card`} className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4.5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-tight">Cargo Dispatch & Crew Assignment</h2>
              <p className="text-[11px] text-slate-400">Assign rig and up to 2 drivers for long-haul duty</p>
            </div>
          </div>
          <button
            id="close-assignment-modal"
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Summary badging of active choices */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              {/* Truck Info */}
              <div>
                <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Assigned Rig</span>
                <span className="block text-sm font-bold text-slate-900 mt-0.5 truncate">{truck.id}</span>
                <span className="block text-xs text-slate-500 truncate">{truck.name || 'Heavy Hauler'}</span>
                <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                  {truck.type || 'Standard'} • {truck.axles || 3} Axles
                </span>
              </div>

              {/* Primary Driver */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider">Lead Driver (Pilot 1)</span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">Primary</span>
                </div>
                <span className="block text-sm font-bold text-slate-900 mt-0.5 truncate">{driver.name}</span>
                <span className="block text-xs text-slate-500 font-mono truncate">{driver.id}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5 truncate">CDL: {driver.licenseNumber}</span>
              </div>
            </div>

            {/* Second Driver / Co-Pilot Section */}
            <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Second Driver / Co-Pilot</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Optional Team Drive)</span>
                </div>
                {activeCoDriver && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCoDriver(null);
                      setShowCoDriverPicker(false);
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Remove 2nd Driver
                  </button>
                )}
              </div>

              {activeCoDriver ? (
                <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">{activeCoDriver.name}</span>
                      <span className="text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                        Co-Driver
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      ID: {activeCoDriver.id} • CDL: {activeCoDriver.licenseNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoDriverPicker(!showCoDriverPicker)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline ml-2 shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  {!showCoDriverPicker ? (
                    <button
                      type="button"
                      onClick={() => setShowCoDriverPicker(true)}
                      className="w-full py-2 px-3 border border-slate-300 border-dashed rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add 2nd Driver to this Truck (Dual Pilot)</span>
                    </button>
                  ) : null}
                </div>
              )}

              {/* Co-Driver Selector Dropdown/List */}
              {showCoDriverPicker && (
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Select Available Co-Pilot:</span>
                    <button
                      type="button"
                      onClick={() => setShowCoDriverPicker(false)}
                      className="text-slate-400 hover:text-slate-600 text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                  {candidateCoDrivers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-1">
                      No other drivers are currently available for co-pilot assignment.
                    </p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {candidateCoDrivers.map((cDriver) => (
                        <button
                          key={cDriver.id}
                          type="button"
                          onClick={() => {
                            setActiveCoDriver(cDriver);
                            setShowCoDriverPicker(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            activeCoDriver?.id === cDriver.id
                              ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="truncate">{cDriver.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                            {cDriver.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Fields: Route Locations */}
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
                placeholder="e.g. Dammam Port Terminal 2"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex justify-center select-none py-0.5">
              <div className="bg-slate-100 p-1.5 rounded-full border border-slate-200/60 text-slate-400">
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
                placeholder="e.g. Riyadh Industrial City Yard B"
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              id="trip-assignment-cancel"
              onClick={onCancel}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="trip-assignment-submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" />
              <span>
                {activeCoDriver ? 'Confirm & Dispatch (2 Pilots)' : 'Confirm & Dispatch (1 Pilot)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
