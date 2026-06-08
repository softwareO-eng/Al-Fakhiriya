/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Truck, Driver } from '../types';
import { PlusCircle, Truck as TruckIcon, User, Plus, X } from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTruck: (truck: Truck) => Promise<void>;
  onAddDriver: (driver: Driver) => Promise<void>;
}

export default function AddAssetModal({
  isOpen,
  onClose,
  onAddTruck,
  onAddDriver,
}: AddAssetModalProps) {
  const [assetType, setAssetType] = useState<'truck' | 'driver'>('truck');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  
  // Truck details fields
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [currentMileage, setCurrentMileage] = useState('');
  
  // Driver only fields
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const randVal = Math.floor(100 + Math.random() * 900);
    const parsedId = id.trim().replace(/^(TRK-|DRV-)/i, '');
    const cleanIdPart = parsedId || `${randVal}`;
    const trimmedId = assetType === 'truck' ? `TRK-${cleanIdPart}` : `DRV-${cleanIdPart}`;
    const trimmedName = name.trim() || (assetType === 'truck' ? `Fleet Rig ${cleanIdPart}` : `Staff Driver ${cleanIdPart}`);

    setLoading(true);
    try {
      if (assetType === 'truck') {
        const newTruck: Truck = {
          id: trimmedId,
          name: trimmedName,
          status: 'Available',
          model: model.trim() || 'General Rig',
          year: year.trim() || `${new Date().getFullYear()}`,
          licensePlate: licensePlate.trim() || 'N/A',
          capacity: capacity.trim() || '45,000 lbs',
          fuelType: fuelType || 'Diesel',
          currentMileage: currentMileage.trim() || '0 mi',
        };
        await onAddTruck(newTruck);
      } else {
        const trimmedLicense = license.trim() || 'CDL-DRAFT';
        const trimmedPhone = phone.trim() || '+1 (555) 010-0000';
        const newDriver: Driver = {
          id: trimmedId,
          name: trimmedName,
          licenseNumber: trimmedLicense,
          phoneNumber: trimmedPhone,
          status: 'Available',
        };
        await onAddDriver(newDriver);
      }
      
      // Reset & Close
      setId('');
      setName('');
      setLicense('');
      setPhone('');
      setModel('');
      setYear('');
      setLicensePlate('');
      setCapacity('');
      setFuelType('Diesel');
      setCurrentMileage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database sync connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="add-asset-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div id="add-asset-modal-card" className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5 text-indigo-400" />
            <span className="font-sans font-medium text-base">Add New Fleet Resource</span>
          </div>
          <button
            id="close-add-asset-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Asset Type Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              id="select-add-truck"
              onClick={() => {
                setAssetType('truck');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                assetType === 'truck'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TruckIcon className="h-3.5 w-3.5" />
              <span>Rig / Truck</span>
            </button>
            <button
              type="button"
              id="select-add-driver"
              onClick={() => {
                setAssetType('driver');
                setError('');
              }}
              className={`flex-1 flex-0 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                assetType === 'driver'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Pilot / Driver</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                {assetType === 'truck' ? 'ID Number (e.g. 105)' : 'Driver ID Number (e.g. 501)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono">
                  {assetType === 'truck' ? 'TRK-' : 'DRV-'}
                </span>
                <input
                  id="asset-id-input"
                  type="text"
                  value={id.replace(/^(TRK-|DRV-)/i, '')}
                  onChange={(e) => {
                    setId(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="105"
                  className="w-full text-sm font-semibold font-mono pl-12 pr-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                {assetType === 'truck' ? 'Truck Description Name' : 'Driver Full Name'}
              </label>
              <input
                id="asset-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder={assetType === 'truck' ? 'e.g. Blue Hauler Mack' : 'e.g. Alice Cooper'}
                className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
              />
            </div>

            {assetType === 'truck' && (
              <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-slate-100">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Truck Model & Make
                  </label>
                  <input
                    id="truck-model-input"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Kenworth T680 Sleeper"
                    className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e5697] text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                    License Plate Code
                  </label>
                  <input
                    id="truck-plate-input"
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. TX-RD-9102"
                    className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e5697] text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Hauling Weight Cargo Rate
                  </label>
                  <input
                    id="truck-capacity-input"
                    type="text"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 48,000 lbs"
                    className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e5697] text-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Current Mileage reading
                  </label>
                  <input
                    id="truck-mileage-input"
                    type="text"
                    value={currentMileage}
                    onChange={(e) => setCurrentMileage(e.target.value)}
                    placeholder="e.g. 142,500 mi"
                    className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e5697] text-slate-800 font-mono"
                  />
                </div>
              </div>
            )}

            {assetType === 'driver' && (
              <>
                <div>
                  <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                    License Number (CDL)
                  </label>
                  <input
                    id="driver-license-input"
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    placeholder="e.g. CDL-CA-44910"
                    className="w-full text-sm font-mono px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Phone Contact Number
                  </label>
                  <input
                    id="driver-phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 018-9321"
                    className="w-full text-sm font-mono px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-slate-800"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <p id="asset-error" className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded">
              {error}
            </p>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              id="close-add-asset"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-add-asset"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{loading ? 'Adding...' : 'Add resource'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
