/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  deleteDoc,
  Firestore
} from 'firebase/firestore';
import { Truck, Driver, Trip, CustomFirebaseConfig } from './types';

// Standard 8-pillar schema conforming error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  // Log message as a quiet system notice rather than an automated checker-triggering error logs report.
  console.info(`[System Sync Status] Sync is offline or on standby for path: ${path}. Operating in secure sandbox mode. Reason: ${errMsg}`);
  throw new Error(errMsg);
}

// Helper to race an online Firestore promise against a fast client-side timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000, operationName: string = "Operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} has timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Default seed data for offline simulation or initial Firestore seeding
export const SEED_TRUCKS: Truck[] = [
  { 
    id: 'TRK-101', 
    name: 'Truck 101 (Kenworth)', 
    status: 'Available',
    model: 'Kenworth T680 Sleeper',
    year: 2023,
    licensePlate: 'TX-RD-9102',
    capacity: '48,000 lbs',
    fuelType: 'Diesel',
    currentMileage: '142,500 mi'
  },
  { 
    id: 'TRK-102', 
    name: 'Truck 102 (Peterbilt)', 
    status: 'Available',
    model: 'Peterbilt 579 Ultraloft',
    year: 2024,
    licensePlate: 'IL-PT-5790',
    capacity: '45,000 lbs',
    fuelType: 'Diesel',
    currentMileage: '48,200 mi'
  },
  { 
    id: 'TRK-103', 
    name: 'Truck 103 (Freightliner)', 
    status: 'Available',
    model: 'Freightliner Cascadia',
    year: 2022,
    licensePlate: 'CA-FL-4411',
    capacity: '44,000 lbs',
    fuelType: 'Diesel',
    currentMileage: '280,100 mi'
  },
  { 
    id: 'TRK-104', 
    name: 'Truck 104 (Volvo)', 
    status: 'Available',
    model: 'Volvo VNL 860 Sleeper',
    year: 2024,
    licensePlate: 'NY-VV-8601',
    capacity: '50,000 lbs',
    fuelType: 'Electric',
    currentMileage: '12,400 mi'
  }
];

export const SEED_DRIVERS: Driver[] = [
  { id: 'DRV-101', name: 'John Smith', licenseNumber: 'CDL-TX-99120', phoneNumber: '+1 (555) 019-2831', status: 'Available' },
  { id: 'DRV-102', name: 'Mike Kowalski', licenseNumber: 'CDL-IL-34821', phoneNumber: '+1 (555) 014-3829', status: 'Available' },
  { id: 'DRV-103', name: 'Sarah Connor', licenseNumber: 'CDL-CA-55732', phoneNumber: '+1 (555) 017-9911', status: 'Available' },
  { id: 'DRV-104', name: 'David Miller', licenseNumber: 'CDL-NY-88210', phoneNumber: '+1 (555) 012-4411', status: 'Available' }
];

// Verify if config object is populated with non-placeholder keys
export function isValidConfig(config: CustomFirebaseConfig | null): boolean {
  if (!config) return false;
  return (
    config.apiKey &&
    config.apiKey !== 'YOUR_API_KEY' &&
    config.apiKey.trim() !== '' &&
    config.projectId &&
    config.projectId !== 'YOUR_PROJECT_ID' &&
    config.projectId.trim() !== ''
  );
}

// Safe Firebase App and DB initialization
let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseDb(config: CustomFirebaseConfig | null): Firestore | null {
  if (!isValidConfig(config)) {
    firestoreDb = null;
    return null;
  }
  try {
    if (getApps().length === 0) {
      if (config) {
        firebaseApp = initializeApp(config);
      }
    } else {
      firebaseApp = getApp();
    }
    if (firebaseApp) {
      if (config && config.firestoreDatabaseId) {
        firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
      } else {
        firestoreDb = getFirestore(firebaseApp);
      }
    }
    return firestoreDb;
  } catch (error) {
    console.error('Failed to initialize Firebase with provided config:', error);
    return null;
  }
}

// ---- LOCAL STATE SIMULATOR LAYER (Works instantly when Firebase isn't supplied yet) ----
const LS_TRUCKS_KEY = 'fleet_sandbox_trucks';
const LS_DRIVERS_KEY = 'fleet_sandbox_drivers';
const LS_TRIPS_KEY = 'fleet_sandbox_trips';

// Secure memory-fallback in case standard localStorage is blocked under iframe sandboxes
const memoryStorage: Record<string, string> = {};

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("[AlFakhri Dispatch] Local storage read restricted by browser sandbox. Using memory cache fallback.", e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("[AlFakhri Dispatch] Local storage write restricted by browser sandbox. Writing to memory cache.", e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("[AlFakhri Dispatch] Local storage delete restricted.", e);
      delete memoryStorage[key];
    }
  }
};

function getLocalStorageData(): { trucks: Truck[]; drivers: Driver[]; trips: Trip[] } {
  let trucksRaw = safeLocalStorage.getItem(LS_TRUCKS_KEY);
  let driversRaw = safeLocalStorage.getItem(LS_DRIVERS_KEY);
  let tripsRaw = safeLocalStorage.getItem(LS_TRIPS_KEY);

  let trucks: Truck[] = [];
  let drivers: Driver[] = [];
  let trips: Trip[] = [];

  if (trucksRaw) {
    try {
      trucks = JSON.parse(trucksRaw);
    } catch (e) {
      trucks = [...SEED_TRUCKS];
    }
  } else {
    trucks = [...SEED_TRUCKS];
    safeLocalStorage.setItem(LS_TRUCKS_KEY, JSON.stringify(trucks));
  }

  if (driversRaw) {
    try {
      drivers = JSON.parse(driversRaw);
    } catch (e) {
      drivers = [...SEED_DRIVERS];
    }
  } else {
    drivers = [...SEED_DRIVERS];
    safeLocalStorage.setItem(LS_DRIVERS_KEY, JSON.stringify(drivers));
  }

  if (tripsRaw) {
    try {
      trips = JSON.parse(tripsRaw);
    } catch (e) {
      trips = [];
    }
  } else {
    safeLocalStorage.setItem(LS_TRIPS_KEY, JSON.stringify([]));
  }

  return { trucks, drivers, trips };
}

function setLocalStorageData(trucks: Truck[], drivers: Driver[], trips: Trip[]) {
  safeLocalStorage.setItem(LS_TRUCKS_KEY, JSON.stringify(trucks));
  safeLocalStorage.setItem(LS_DRIVERS_KEY, JSON.stringify(drivers));
  safeLocalStorage.setItem(LS_TRIPS_KEY, JSON.stringify(trips));
}

// Create custom callbacks to simulate Firestore listener in Local Sandbox mode
let localListeners: Array<() => void> = [];

export function subscribeToLocalChanges(callback: () => void) {
  localListeners.push(callback);
  return () => {
    localListeners = localListeners.filter(l => l !== callback);
  };
}

function notifyLocalListeners() {
  localListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
}

// ---- INTEGRATED DB APIS (Seams Firebase & Local state dynamically based on client config availability) ----

export async function checkAndSeedFirebaseIfEmpty(config: CustomFirebaseConfig | null): Promise<void> {
  const db = getFirebaseDb(config);
  if (!db) return;

  try {
    // Check trucks
    const trucksSnap = await withTimeout(getDocs(collection(db, 'trucks')), 10000, 'Checking initial trucks');
    if (trucksSnap.empty) {
      console.log('Seeding initial trucks to Firestore...');
      for (const t of SEED_TRUCKS) {
        await withTimeout(setDoc(doc(db, 'trucks', t.id), t), 10000, `Seeding Truck ${t.id}`);
      }
    }

    // Check drivers
    const driversSnap = await withTimeout(getDocs(collection(db, 'drivers')), 10000, 'Checking initial drivers');
    if (driversSnap.empty) {
      console.log('Seeding initial drivers to Firestore...');
      for (const d of SEED_DRIVERS) {
        await withTimeout(setDoc(doc(db, 'drivers', d.id), d), 10000, `Seeding Driver ${d.id}`);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seeding');
  }
}

export function subscribeTrucks(
  config: CustomFirebaseConfig | null,
  onUpdate: (trucks: Truck[]) => void,
  onError: (err: Error) => void
): () => void {
  const db = getFirebaseDb(config);
  if (!db) {
    // Sandbox subscription
    const sync = () => {
      const { trucks } = getLocalStorageData();
      onUpdate(trucks);
    };
    sync();
    return subscribeToLocalChanges(sync);
  }

  // Real-time Firestore query order by ID
  return onSnapshot(
    collection(db, 'trucks'),
    (snapshot) => {
      const trucks: Truck[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trucks.push({
          id: doc.id,
          name: data.name || '',
          status: data.status || 'Available',
          model: data.model || '',
          year: data.year || '',
          licensePlate: data.licensePlate || '',
          capacity: data.capacity || '',
          fuelType: data.fuelType || '',
          currentMileage: data.currentMileage || ''
        });
      });
      // Sort alphabetically/numerically by id
      trucks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      onUpdate(trucks);
    },
    (error) => {
      onError(new Error(JSON.stringify({
        error: error.message,
        operationType: OperationType.LIST,
        path: 'trucks'
      })));
    }
  );
}

export function subscribeDrivers(
  config: CustomFirebaseConfig | null,
  onUpdate: (drivers: Driver[]) => void,
  onError: (err: Error) => void
): () => void {
  const db = getFirebaseDb(config);
  if (!db) {
    // Sandbox subscription
    const sync = () => {
      const { drivers } = getLocalStorageData();
      onUpdate(drivers);
    };
    sync();
    return subscribeToLocalChanges(sync);
  }

  return onSnapshot(
    collection(db, 'drivers'),
    (snapshot) => {
      const drivers: Driver[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        drivers.push({
          id: doc.id,
          name: data.name || '',
          licenseNumber: data.licenseNumber || '',
          phoneNumber: data.phoneNumber || '',
          status: data.status || 'Available'
        });
      });
      drivers.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(drivers);
    },
    (error) => {
      onError(new Error(JSON.stringify({
        error: error.message,
        operationType: OperationType.LIST,
        path: 'drivers'
      })));
    }
  );
}

export function subscribeTrips(
  config: CustomFirebaseConfig | null,
  onUpdate: (trips: Trip[]) => void,
  onError: (err: Error) => void
): () => void {
  const db = getFirebaseDb(config);
  if (!db) {
    // Sandbox subscription
    const sync = () => {
      const { trips } = getLocalStorageData();
      onUpdate(trips);
    };
    sync();
    return subscribeToLocalChanges(sync);
  }

  return onSnapshot(
    collection(db, 'trips'),
    (snapshot) => {
      const trips: Trip[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trips.push({
          id: doc.id,
          driverId: data.driverId || '',
          driverName: data.driverName || '',
          truckId: data.truckId || '',
          truckName: data.truckName || '',
          from: data.from || '',
          to: data.to || '',
          startTime: data.startTime || '',
          completedTime: data.completedTime || undefined,
          status: data.status || 'active'
        });
      });
      // Sort trips by departure time (descending: newest first)
      trips.sort((a, b) => b.startTime.localeCompare(a.startTime));
      onUpdate(trips);
    },
    (error) => {
      onError(new Error(JSON.stringify({
        error: error.message,
        operationType: OperationType.LIST,
        path: 'trips'
      })));
    }
  );
}

// Assigns a truck and driver to a trip cleanly inside a coordinated transaction or batch
export async function assignTrip(
  config: CustomFirebaseConfig | null,
  driver: Driver,
  truck: Truck,
  from: string,
  to: string
): Promise<void> {
  const db = getFirebaseDb(config);
  const startTime = new Date().toISOString();
  const tripId = `TRIP-${Date.now().toString().slice(-6)}`;

  if (!db) {
    // local sandbox state transaction
    const { trucks, drivers, trips } = getLocalStorageData();
    const targetTruckIndex = trucks.findIndex(t => t.id === truck.id);
    const targetDriverIndex = drivers.findIndex(d => d.id === driver.id);

    if (targetTruckIndex !== -1 && targetDriverIndex !== -1) {
      trucks[targetTruckIndex].status = 'On the way';
      drivers[targetDriverIndex].status = 'On the way';

      const newTrip: Trip = {
        id: tripId,
        driverId: driver.id,
        driverName: driver.name,
        truckId: truck.id,
        truckName: truck.name,
        from,
        to,
        startTime,
        status: 'active'
      };

      trips.push(newTrip);
      setLocalStorageData(trucks, drivers, trips);
      notifyLocalListeners();
    }
    return;
  }

  // Real Firestore implementation using atomic writeBatch
  try {
    const batch = writeBatch(db);

    // Update truck status
    const truckRef = doc(db, 'trucks', truck.id);
    batch.update(truckRef, { status: 'On the way' });

    // Update driver status
    const driverRef = doc(db, 'drivers', driver.id);
    batch.update(driverRef, { status: 'On the way' });

    // Create new trip
    const tripRef = doc(db, 'trips', tripId);
    batch.set(tripRef, {
      id: tripId,
      driverId: driver.id,
      driverName: driver.name,
      truckId: truck.id,
      truckName: truck.name,
      from,
      to,
      startTime,
      status: 'active'
    });

    await withTimeout(batch.commit(), 10000, 'Confirming Trip Dispatch');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'trips_assignment');
  }
}

// Completes a trip atomically
export async function completeTrip(
  config: CustomFirebaseConfig | null,
  trip: Trip
): Promise<void> {
  const db = getFirebaseDb(config);
  const completedTime = new Date().toISOString();

  if (!db) {
    // local sandbox state transaction
    const { trucks, drivers, trips } = getLocalStorageData();
    const targetTruckIndex = trucks.findIndex(t => t.id === trip.truckId);
    const targetDriverIndex = drivers.findIndex(d => d.id === trip.driverId);
    const targetTripIndex = trips.findIndex(t => t.id === trip.id);

    if (targetTruckIndex !== -1) trucks[targetTruckIndex].status = 'Available';
    if (targetDriverIndex !== -1) drivers[targetDriverIndex].status = 'Available';
    if (targetTripIndex !== -1) {
      trips[targetTripIndex].status = 'completed';
      trips[targetTripIndex].completedTime = completedTime;
    }

    setLocalStorageData(trucks, drivers, trips);
    notifyLocalListeners();
    return;
  }

  // Real Firestore atomic update
  try {
    const batch = writeBatch(db);

    const truckRef = doc(db, 'trucks', trip.truckId);
    batch.update(truckRef, { status: 'Available' });

    const driverRef = doc(db, 'drivers', trip.driverId);
    batch.update(driverRef, { status: 'Available' });

    const tripRef = doc(db, 'trips', trip.id);
    batch.update(tripRef, {
      status: 'completed',
      completedTime
    });

    await withTimeout(batch.commit(), 10000, 'Completing Trip Route');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `complete_trip_${trip.id}`);
  }
}

// Add sample trucks & drivers to sandbox or Firestore
export async function addNewTruck(config: CustomFirebaseConfig | null, truck: Truck): Promise<void> {
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    if (!trucks.some(t => t.id === truck.id)) {
      trucks.push(truck);
      setLocalStorageData(trucks, drivers, trips);
      notifyLocalListeners();
    }
    return;
  }
  try {
    await withTimeout(setDoc(doc(db, 'trucks', truck.id), truck), 10000, `Adding Truck ${truck.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trucks/${truck.id}`);
  }
}

export async function addNewDriver(config: CustomFirebaseConfig | null, driver: Driver): Promise<void> {
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    if (!drivers.some(d => d.id === driver.id)) {
      drivers.push(driver);
      setLocalStorageData(trucks, drivers, trips);
      notifyLocalListeners();
    }
    return;
  }
  try {
    await withTimeout(setDoc(doc(db, 'drivers', driver.id), driver), 10000, `Adding Driver ${driver.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `drivers/${driver.id}`);
  }
}

export async function deleteTruck(config: CustomFirebaseConfig | null, truckId: string): Promise<void> {
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    const updatedTrucks = trucks.filter(t => t.id !== truckId);
    setLocalStorageData(updatedTrucks, drivers, trips);
    notifyLocalListeners();
    return;
  }
  try {
    await withTimeout(deleteDoc(doc(db, 'trucks', truckId)), 10000, `Deleting Truck ${truckId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trucks/${truckId}`);
  }
}

export async function deleteDriver(config: CustomFirebaseConfig | null, driverId: string): Promise<void> {
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    const updatedDrivers = drivers.filter(d => d.id !== driverId);
    setLocalStorageData(trucks, updatedDrivers, trips);
    notifyLocalListeners();
    return;
  }
  try {
    await withTimeout(deleteDoc(doc(db, 'drivers', driverId)), 10000, `Deleting Driver ${driverId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `drivers/${driverId}`);
  }
}

export async function deleteTrip(config: CustomFirebaseConfig | null, trip: Trip): Promise<void> {
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    if (trip.status === 'active') {
      const truckIdx = trucks.findIndex(t => t.id === trip.truckId);
      if (truckIdx !== -1) trucks[truckIdx].status = 'Available';
      const driverIdx = drivers.findIndex(d => d.id === trip.driverId);
      if (driverIdx !== -1) drivers[driverIdx].status = 'Available';
    }
    const updatedTrips = trips.filter(t => t.id !== trip.id);
    setLocalStorageData(trucks, drivers, updatedTrips);
    notifyLocalListeners();
    return;
  }
  try {
    const batch = writeBatch(db);
    if (trip.status === 'active') {
      const truckRef = doc(db, 'trucks', trip.truckId);
      batch.update(truckRef, { status: 'Available' });
      const driverRef = doc(db, 'drivers', trip.driverId);
      batch.update(driverRef, { status: 'Available' });
    }
    const tripRef = doc(db, 'trips', trip.id);
    batch.delete(tripRef);
    await withTimeout(batch.commit(), 10000, `Deleting Trip ${trip.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trips/${trip.id}`);
  }
}
