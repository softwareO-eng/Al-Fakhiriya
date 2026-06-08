/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Truck as TruckIcon,
  User as DriverIcon,
  Navigation,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  ExternalLink,
  Settings,
  Database,
  History,
  FileDown,
  AlertTriangle,
  Flame,
  XCircle,
  HelpCircle,
  SendHorizontal,
  Trash2
} from 'lucide-react';

import { Truck, Driver, Trip, CustomFirebaseConfig } from './types';
import {
  subscribeTrucks,
  subscribeDrivers,
  subscribeTrips,
  assignTrip,
  completeTrip,
  checkAndSeedFirebaseIfEmpty,
  addNewTruck,
  addNewDriver,
  isValidConfig,
  deleteTruck,
  deleteDriver,
  deleteTrip
} from './firebaseService';

import FirebaseConfigModal from './components/FirebaseConfigModal';
import TripAssignmentModal from './components/TripAssignmentModal';
import AddAssetModal from './components/AddAssetModal';
import MapDirectionLink from './components/MapDirectionLink';
import AiCopilot from './components/AiCopilot';
import KeyDiagnosticsModal from './components/KeyDiagnosticsModal';
import AlFakhriLogo from './components/AlFakhriLogo';

// Memory fallback for localStorage variables to prevent SecurityError crashes inside iframe environments
const memoryStorage: Record<string, string> = {};

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("[AlFakhri App] Local storage config read blocked by sandbox. Using memory fallback.", e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("[AlFakhri App] Local storage config write blocked by sandbox. Writing to memory.", e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("[AlFakhri App] Local storage delete blocked.", e);
      delete memoryStorage[key];
    }
  }
};

export default function App() {
  // Config state
  const [firebaseConfig, setFirebaseConfig] = useState<CustomFirebaseConfig | null>(() => {
    // Priority 1: Check if environment variables are configured via secrets
    const environmentConfig: CustomFirebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    if (environmentConfig.apiKey && environmentConfig.projectId) {
      return environmentConfig;
    }

    // Priority 2: Check standard localStorage fallback
    const saved = safeLocalStorage.getItem('fleet_firebase_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // UI state
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const [localFallbackActive, setLocalFallbackActive] = useState<boolean>(false);
  const configToUse = localFallbackActive ? null : firebaseConfig;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Initializing');
  const [loading, setLoading] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Sync listener registers
  useEffect(() => {
    // Initial database seed if valid Firestore configuration exists
    if (isValidConfig(configToUse)) {
      setStatusText('Online Cloud Sync Active');
      setErrorMessage(null);
      
      // Run the initial check and seed process asynchronously in the background.
      // This prevents thread blocking and keeps real-time subscriptions fast and active.
      checkAndSeedFirebaseIfEmpty(configToUse)
        .then(() => {
          console.info("Firestore cloud initial checks completed successfully.");
        })
        .catch((err) => {
          console.warn("Firestore background seed check bypassed/standby: ", err.message);
        });
    } else {
      setStatusText('Sandbox Mode (Local Storage)');
    }

    // Subscribe to Trucks
    const unsubscribeTrucks = subscribeTrucks(
      configToUse,
      (updatedTrucks) => {
        setTrucks(updatedTrucks);
        setLoading(false);
      },
      (err) => {
        console.warn("Truck subscription update notice:", err.message);
        if (!isValidConfig(configToUse)) {
          setLocalFallbackActive(true);
          setStatusText('Sandbox Mode (Offline Fallback)');
        }
        setLoading(false);
      }
    );

    // Subscribe to Drivers
    const unsubscribeDrivers = subscribeDrivers(
      configToUse,
      (updatedDrivers) => {
        setDrivers(updatedDrivers);
      },
      (err) => {
        console.warn("Driver subscription update notice:", err.message);
        if (!isValidConfig(configToUse)) {
          setLocalFallbackActive(true);
          setStatusText('Sandbox Mode (Offline Fallback)');
        }
      }
    );

    // Subscribe to Trips
    const unsubscribeTrips = subscribeTrips(
      configToUse,
      (updatedTrips) => {
        setTrips(updatedTrips);
      },
      (err) => {
        console.warn("Trip subscription update notice:", err.message);
        if (!isValidConfig(configToUse)) {
          setLocalFallbackActive(true);
          setStatusText('Sandbox Mode (Offline Fallback)');
        }
      }
    );

    return () => {
      unsubscribeTrucks();
      unsubscribeDrivers();
      unsubscribeTrips();
    };
  }, [firebaseConfig, localFallbackActive]);

  // If both are selected, open assignment modal automatically
  useEffect(() => {
    if (selectedTruck && selectedDriver) {
      setIsAssignOpen(true);
    }
  }, [selectedTruck, selectedDriver]);

  // Config saver
  const handleSaveConfig = (newConfig: CustomFirebaseConfig | null) => {
    if (newConfig) {
      safeLocalStorage.setItem('fleet_firebase_config', JSON.stringify(newConfig));
    } else {
      safeLocalStorage.removeItem('fleet_firebase_config');
    }
    setFirebaseConfig(newConfig);
    setLocalFallbackActive(false); // Reset fallback flag to try again with the new configuration!
    setErrorMessage(null);
    setSelectedTruck(null);
    setSelectedDriver(null);
  };

  // Assign route
  const handleConfirmAssignment = async (from: string, to: string) => {
    if (!selectedTruck || !selectedDriver) return;
    try {
      await assignTrip(configToUse, selectedDriver, selectedTruck, from, to);
      setIsAssignOpen(false);
      setSelectedTruck(null);
      setSelectedDriver(null);
    } catch (err) {
      alert(`Assignment failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCancelAssignment = () => {
    setIsAssignOpen(false);
    setSelectedTruck(null);
    setSelectedDriver(null);
  };

  // Complete route
  const handleCompleteTrip = async (trip: Trip) => {
    try {
      await completeTrip(configToUse, trip);
    } catch (err) {
      alert(`Could not complete route: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Add asset triggers
  const handleAddTruck = async (truckOn: Truck) => {
    if (trucks.some(t => t.id.trim().toUpperCase() === truckOn.id.trim().toUpperCase())) {
      throw new Error(`A truck with ID "${truckOn.id}" is already registered in the dispatch board.`);
    }
    await addNewTruck(configToUse, truckOn);
  };

  const handleAddDriver = async (driverOn: Driver) => {
    if (drivers.some(d => d.id.trim().toUpperCase() === driverOn.id.trim().toUpperCase())) {
      throw new Error(`A pilot with ID "${driverOn.id}" is already registered in the dispatch board.`);
    }
    await addNewDriver(configToUse, driverOn);
  };

  const handleDeleteTruck = async (truckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove Rig ${truckId} from the fleet registry?`)) {
      return;
    }
    try {
      if (selectedTruck?.id === truckId) {
        setSelectedTruck(null);
      }
      await deleteTruck(configToUse, truckId);
    } catch (err) {
      alert(`Could not delete truck: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteDriver = async (driverId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove Pilot ${driverId} from the dispatch roster?`)) {
      return;
    }
    try {
      if (selectedDriver?.id === driverId) {
        setSelectedDriver(null);
      }
      await deleteDriver(configToUse, driverId);
    } catch (err) {
      alert(`Could not delete driver: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteTrip = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    const actionLabel = trip.status === 'active' ? 'cancel & abort this active' : 'delete historical';
    if (!window.confirm(`Are you sure you want to ${actionLabel} dispatch record ${trip.id}?`)) {
      return;
    }
    try {
      await deleteTrip(configToUse, trip);
    } catch (err) {
      alert(`Could not delete trip: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filter lists
  const availableTrucks = trucks.filter((t) => t.status === 'Available');
  const onTheWayTrucks = trucks.filter((t) => t.status === 'On the way');

  const availableDrivers = drivers.filter((d) => d.status === 'Available');
  const onTheWayDrivers = drivers.filter((d) => d.status === 'On the way');

  const activeTrips = trips.filter((t) => t.status === 'active');
  const completedTrips = trips.filter((t) => t.status === 'completed');

  // Format Dates nicely
  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return isoStr;
    }
  };

  // Generate Standalone HTML compiler and download trigger
  const exportStandaloneHtml = () => {
    const configPlaceholderString = JSON.stringify(firebaseConfig || {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    }, null, 2);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AlFakhri Group Fleet Dispatch Panel</title>
  <!-- Tailwind Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Font pairs -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen pb-12">

  <!-- STANDALONE BANNER -->
  <div class="bg-indigo-900 text-white text-xs px-4 py-2 flex items-center justify-between font-mono">
    <span>⚡ Standalone HTML Export Panel</span>
    <span>Ready to Dispatch</span>
  </div>

  <div id="app" class="max-w-7xl mx-auto px-4 py-6">
    <div class="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center mt-12 shadow-lg">
      <div class="text-indigo-600 mb-4 flex justify-center">
        <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a1 1 0 00-1-1h-3M13 10h4m-4 3h1h1"></svg>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-2">Fleet Management Integration</h1>
      <p class="text-sm text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed">
        This file is prepared for direct execution. Paste your Firebase configurations into the script block of this file, or run it through local server hosting.
      </p>

      <div class="bg-slate-950 p-4 rounded-xl text-left border border-slate-800 mb-6 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
<pre><code>// Current Firebase Coordinates configured:
const firebaseConfig = ${configPlaceholderString};</code></pre>
      </div>

      <div class="text-xs text-slate-500 mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-left">
        <strong class="text-yellow-800">Quick Steps to Activate:</strong>
        <ol class="list-decimal pl-4 space-y-1 mt-1 text-[11px]">
          <li>Open this exported HTML file in any code or text editor.</li>
          <li>Find the <code class="bg-white px-1 py-0.5 rounded border">firebaseConfig</code> constant placeholder at line ~90.</li>
          <li>Paste the config Web SDK credentials from your Firebase Console.</li>
          <li>Double click to launch instantly in your desktop browser!</li>
        </ol>
      </div>

      <div class="flex justify-center space-x-3 text-sm font-semibold">
        <button onclick="window.close()" class="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all">Close</button>
        <a href="https://console.firebase.google.com/" target="_blank" class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all inline-flex items-center space-x-1.5">Open Firebase Console</a>
      </div>
    </div>
  </div>

</body>
</html>`;

    // Download dynamic blob file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fleet-management-standalone.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="app-root-container" className="bg-slate-50 min-h-screen text-slate-900 font-sans antialiased pb-16 selection:bg-indigo-100">
      
      {/* Main Navbar */}
      <nav id="main-navigation" className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlFakhriLogo />
          </div>

          <div className="flex items-center space-x-3.5">
            {/* Asset Add Dialog Trigger */}
            <button
              id="add-custom-resource-trigger"
              onClick={() => setIsAddAssetOpen(true)}
              className="inline-flex items-center space-x-1.5 bg-[#0e5697] hover:bg-[#0b4880] text-white px-4 py-2.5 text-xs font-semibold rounded-xl transition-transform active:scale-98 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add asset</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Space */}
      <main id="dispatch-dashboard" className="max-w-7xl mx-auto px-4 py-8 space-y-6">



        {/* Selection HUD Panel */}
        {(selectedTruck || selectedDriver) && (
          <div id="matching-stage-hud" className="bg-indigo-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-4xl mx-auto shadow-md animate-in slide-in-from-top-6 duration-200">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-950/80 rounded-xl relative">
                <SendHorizontal className="h-5 w-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-mono font-medium text-indigo-300 uppercase tracking-widest">Active Dispatch Blueprint</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm font-semibold">
                  {selectedTruck ? (
                    <span className="bg-indigo-950 px-2.5 py-1 rounded-md text-emerald-400 border border-indigo-800">
                      🚛 {selectedTruck.id} ({selectedTruck.name})
                    </span>
                  ) : (
                    <span className="text-indigo-300 animate-pulse">Select available Rig...</span>
                  )}
                  <span className="text-indigo-400">➔</span>
                  {selectedDriver ? (
                    <span className="bg-indigo-950 px-2.5 py-1 rounded-md text-yellow-400 border border-indigo-800">
                      👔 {selectedDriver.name}
                    </span>
                  ) : (
                    <span className="text-indigo-300 animate-pulse">Select available Pilot...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                id="reset-selection-triggers"
                onClick={() => {
                  setSelectedTruck(null);
                  setSelectedDriver(null);
                }}
                className="px-4 py-2 border border-indigo-700 hover:bg-indigo-950 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Selection
              </button>
              {selectedTruck && selectedDriver && (
                <button
                  id="open-assignment-direct"
                  onClick={() => setIsAssignOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 shadow-sm transition-transform active:scale-98"
                >
                  Configure Stops
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Content Grid */}
        <div id="operations-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= COLUMN 1: AVAILABLE RESOURCES (trucks + drivers) ================= */}
          <div id="available-vehicles-drivers-column" className="lg:col-span-5 space-y-8">
            
            {/* AVAILABLE TRUCKS SECTION */}
            <div id="available-trucks-container" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <TruckIcon className="text-slate-700 h-4.5 w-4.5" />
                  <h2 className="font-bold text-slate-900 tracking-tight text-sm">Available Fleet Rigs</h2>
                </div>
                <span className="bg-slate-100 text-slate-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {availableTrucks.length}
                </span>
              </div>

               {availableTrucks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p>All fleet rigs are currently fully dispatched.</p>
                  <p className="text-[10px] mt-0.5">Wait for active runs to clear or add more rigs above.</p>
                </div>
              ) : (
                <div id="available-trucks-grid" className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {availableTrucks.map((truck) => {
                    const isSelected = selectedTruck?.id === truck.id;
                    return (
                      <div
                        key={truck.id}
                        id={`truck-card-${truck.id}`}
                        onClick={() => setSelectedTruck(isSelected ? null : truck)}
                        className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1.5 truncate flex-1 pr-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-black uppercase">RIG</span>
                            <span className="font-mono font-bold text-slate-400 text-xs">{truck.id}</span>
                          </div>
                          <div>
                            <span className="block font-semibold text-slate-950 text-sm truncate">{truck.name}</span>
                            {truck.model && (
                              <span className="block text-[11px] text-[#0e5697] font-semibold truncate mt-0.5">{truck.model} {truck.year ? `(${truck.year})` : ''}</span>
                            )}
                          </div>
                          
                          {/* Specifications Grid */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 border-t border-slate-100/80 pt-1.5">
                            <div className="truncate">
                              <span className="text-slate-400">Plate:</span> <strong className="font-mono text-slate-700">{truck.licensePlate || 'N/A'}</strong>
                            </div>
                            <div className="truncate">
                              <span className="text-slate-400">Cap:</span> <strong className="text-slate-700">{truck.capacity || '45k lbs'}</strong>
                            </div>
                            <div className="truncate">
                              <span className="text-slate-400">Fuel:</span> <strong className="text-slate-700">{truck.fuelType || 'Diesel'}</strong>
                            </div>
                            <div className="truncate">
                              <span className="text-slate-400">Mileage:</span> <strong className="font-mono text-slate-700">{truck.currentMileage || 'N/A'}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0 pb-1">
                          <div className="flex items-center space-x-2">
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                              Available
                            </span>
                            <button
                              type="button"
                              title="Delete Truck"
                              onClick={(e) => handleDeleteTruck(truck.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#0e5697] animate-pulse mt-4">✓ Chosen</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AVAILABLE DRIVERS SECTION */}
            <div id="available-drivers-container" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <DriverIcon className="text-slate-700 h-4.5 w-4.5" />
                  <h2 className="font-bold text-slate-900 tracking-tight text-sm">Available Pilots / Drivers</h2>
                </div>
                <span className="bg-slate-100 text-slate-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {availableDrivers.length}
                </span>
              </div>

              {availableDrivers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p>All active pilots are currently dispatched on shipping jobs.</p>
                  <p className="text-[10px] mt-0.5">Wait for active arrivals or hire custom pilots above.</p>
                </div>
              ) : (
                <div id="available-drivers-grid" className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {availableDrivers.map((driver) => {
                    const isSelected = selectedDriver?.id === driver.id;
                    return (
                      <div
                        key={driver.id}
                        id={`driver-card-${driver.id}`}
                        onClick={() => setSelectedDriver(isSelected ? null : driver)}
                        className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5 truncate">
                          <span className="block text-xs font-mono font-bold text-slate-400">PILOT</span>
                          <span className="block font-semibold text-slate-950 text-sm truncate">{driver.name}</span>
                          <span className="block text-[11px] text-slate-600 font-mono">CDL: {driver.licenseNumber}</span>
                          <span className="block text-[11px] text-slate-400 font-mono truncate">{driver.phoneNumber}</span>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                              Available
                            </span>
                            <button
                              type="button"
                              title="Delete Driver"
                              onClick={(e) => handleDeleteDriver(driver.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-700 animate-pulse">✓ Chosen</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ================= COLUMN 2: ON THE WAY (Active Trips + History Log) ================= */}
          <div id="active-completed-dispatch-column" className="lg:col-span-7 space-y-8">
            
            {/* ON THE WAY DRIVES & ACTIVE TRIPS */}
            <div id="on-the-way-trips-container" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Navigation className="text-amber-600 h-4 w-4 animate-bounce" />
                  <h2 className="font-bold text-slate-900 tracking-tight text-sm">Dispatched Cargo ("On the Way")</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-indigo-50 text-indigo-800 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>{activeTrips.length} active runs</span>
                  </span>
                </div>
              </div>

              {activeTrips.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <p className="font-bold text-slate-500">No Shipping Dispatches Engaged Currently</p>
                  <p className="max-w-xs mx-auto leading-relaxed mt-1 text-[11px]">
                    To assign a run, select one Available Rig card on the left + one Available Driver card. Confirmed schedules update live.
                  </p>
                </div>
              ) : (
                <div id="on-the-way-trips-list" className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {activeTrips.map((trip) => (
                    <div
                      key={trip.id}
                      id={`trip-card-${trip.id}`}
                      className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Metadata and route */}
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                            <span>Transit</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">ID: {trip.id}</span>
                        </div>

                        {/* Resource stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs border-b border-dotted border-slate-200 pb-2.5">
                          <div>
                            <span className="block text-[10px] font-mono text-slate-400 font-medium">RIG / ID</span>
                            <span className="font-bold text-slate-800 truncate block">{trip.truckId}</span>
                            <span className="text-[11px] text-slate-500 font-medium truncate block">{trip.truckName}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-mono text-slate-400 font-medium font-bold">PILOT</span>
                            <span className="font-bold text-slate-800 truncate block">{trip.driverName}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate block">ID: {trip.driverId}</span>
                          </div>
                        </div>

                        {/* Route Locations */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="w-2 h-2 text-indigo-500 shrink-0 font-bold">•</span>
                            <span className="text-slate-500 font-medium shrink-0">From:</span>
                            <span className="text-slate-800 font-semibold truncate">{trip.from}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="w-2 h-2 text-emerald-500 shrink-0 font-bold">•</span>
                            <span className="text-slate-500 font-medium shrink-0">To:</span>
                            <span className="text-slate-800 font-semibold truncate">{trip.to}</span>
                          </div>
                        </div>

                        {/* Timetable & Direct Path Links */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>Departed: <strong>{formatDate(trip.startTime)}</strong></span>
                          </div>
                          
                          {/* Map directions link */}
                          <MapDirectionLink
                            id={`map-link-${trip.id}`}
                            from={trip.from}
                            to={trip.to}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-100 shadow-3xs"
                          />
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 border-t md:border-t-0 border-slate-100 pt-3.5 md:pt-0 shrink-0">
                        <button
                          id={`complete-trip-button-${trip.id}`}
                          onClick={() => handleCompleteTrip(trip)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:shadow-xs transition-colors flex items-center space-x-1.5 active:scale-98"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Arrived / Complete Route</span>
                        </button>
                        <button
                          id={`delete-trip-button-${trip.id}`}
                          title="Cancel & Abort Dispatch"
                          onClick={(e) => handleDeleteTrip(trip, e)}
                          className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORICAL REGISTRY OF COMPLETED TRIPS */}
            <div id="completed-history-container" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <History className="text-slate-700 h-4.5 w-4.5" />
                  <h2 className="font-bold text-slate-900 tracking-tight text-sm">Historical Dispatch Log</h2>
                </div>
                <span className="bg-slate-100 text-slate-800 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {completedTrips.length} total logged
                </span>
              </div>

              {completedTrips.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p>Historical runs registry is empty.</p>
                  <p className="text-[10px] mt-0.5">Completed transits appear logged here for audit trails.</p>
                </div>
              ) : (
                <div id="completed-logs-list" className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {completedTrips.map((log) => (
                    <div
                      key={log.id}
                      id={`log-card-${log.id}`}
                      className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-200 text-slate-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                            Delivered
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">{log.id}</span>
                        </div>
                        <p className="font-semibold text-slate-900 truncate">
                          {log.from} ➔ {log.to}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Rig: <strong>{log.truckId}</strong> | Driver: <strong>{log.driverName}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Arrival: {formatDate(log.completedTime || '')}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded">
                          ✓ Complete
                        </div>
                        <button
                          type="button"
                          id={`delete-log-button-${log.id}`}
                          title="Delete Historical Log"
                          onClick={(e) => handleDeleteTrip(log, e)}
                          className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Floating System Configuration Dialog */}
      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={firebaseConfig}
        onSave={handleSaveConfig}
      />

      {/* Trigger Assignment Dialog popup */}
      {selectedTruck && selectedDriver && (
        <TripAssignmentModal
          isOpen={isAssignOpen}
          driver={selectedDriver}
          truck={selectedTruck}
          onConfirm={handleConfirmAssignment}
          onCancel={handleCancelAssignment}
        />
      )}

      {/* Add New Driver / Truck Dialog */}
      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        onAddTruck={handleAddTruck}
        onAddDriver={handleAddDriver}
      />

      {/* AI Assistant Co-Pilot Overlay */}
      <AiCopilot 
        availableTrucks={trucks} 
        availableDrivers={drivers} 
        activeTrips={trips} 
      />

      {/* Diagnostics Modal */}
      <KeyDiagnosticsModal 
        isOpen={isDiagnosticsOpen} 
        onClose={() => setIsDiagnosticsOpen(false)} 
        firebaseConfigExists={isValidConfig(firebaseConfig)} 
      />

      {/* Core Footer instructions */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 mt-24 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-xs text-slate-500 max-w-lg mx-auto font-medium">
            AlFakhri Group Unified Logistics & Fleet Dispatch Control System. Supporting regional heavy hauling & transit optimizations.
          </p>
          <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400 uppercase tracking-widest font-mono select-none">
            <span>&copy; 2026 ALFAKHRI GROUP. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
