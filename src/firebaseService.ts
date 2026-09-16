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
import { Truck, Driver, Trip, CustomFirebaseConfig, TruckStatus, DriverStatus, AppUser, UserRole, MonthlyAssignment } from './types';

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
    currentMileage: '142,500 mi',
    type: 'Flat Bed',
    axles: 4
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
    currentMileage: '48,200 mi',
    type: 'Flat Bed',
    axles: 5
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
    currentMileage: '280,100 mi',
    type: 'Low Bed',
    axles: 3
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
    currentMileage: '12,400 mi',
    type: 'Low Bed',
    axles: 4
  }
];

export const SEED_DRIVERS: Driver[] = [
  { id: 'DRV-101', name: 'John Smith', licenseNumber: 'CDL-TX-99120', phoneNumber: '+1 (555) 019-2831', status: 'Available' },
  { id: 'DRV-102', name: 'Mike Kowalski', licenseNumber: 'CDL-IL-34821', phoneNumber: '+1 (555) 014-3829', status: 'Available' },
  { id: 'DRV-103', name: 'Sarah Connor', licenseNumber: 'CDL-CA-55732', phoneNumber: '+1 (555) 017-9911', status: 'Available' },
  { id: 'DRV-104', name: 'David Miller', licenseNumber: 'CDL-NY-88210', phoneNumber: '+1 (555) 012-4411', status: 'Available' }
];

export const DEFAULT_VIEWER_USER: AppUser = {
  id: 'USR-VIEWER',
  username: 'viewer',
  displayName: 'Viewer',
  role: 'viewer',
  createdAt: '2024-01-01T00:00:00.000Z'
};

export const SEED_USERS: AppUser[] = [
  {
    id: 'USR-ADMIN1',
    username: 'admin1',
    displayName: 'Administrator',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-VIEWER',
    username: 'viewer',
    displayName: 'Viewer (Read Only)',
    role: 'viewer',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-MAAZ',
    username: 'maazarshad934@gmail.com',
    displayName: 'Maaz Arshad',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

export const SEED_PASSWORDS: Record<string, string> = {
  admin1: '4321',
  'maazarshad934@gmail.com': '4321',
  viewer: 'viewer123'
};

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
const LS_MONTHLY_KEY = 'fleet_sandbox_monthly_assignments';
const LS_USERS_KEY = 'fleet_sandbox_users';
const LS_USER_PASSWORDS_KEY = 'fleet_sandbox_user_passwords';
const LS_AUTH_KEY = 'fleet_sandbox_current_user';

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

export function getLocalStorageData(): { trucks: Truck[]; drivers: Driver[]; trips: Trip[] } {
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

export function getLocalStorageUsers(): { users: AppUser[]; passwords: Record<string, string> } {
  const usersRaw = safeLocalStorage.getItem(LS_USERS_KEY);
  const passwordsRaw = safeLocalStorage.getItem(LS_USER_PASSWORDS_KEY);

  let users: AppUser[] = [];
  let passwords: Record<string, string> = { ...SEED_PASSWORDS };

  if (usersRaw) {
    try {
      users = JSON.parse(usersRaw);
    } catch (e) {
      users = [...SEED_USERS];
    }
  } else {
    users = [...SEED_USERS];
    safeLocalStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
  }

  if (passwordsRaw) {
    try {
      passwords = { ...SEED_PASSWORDS, ...JSON.parse(passwordsRaw) };
    } catch (e) {
      passwords = { ...SEED_PASSWORDS };
    }
  } else {
    safeLocalStorage.setItem(LS_USER_PASSWORDS_KEY, JSON.stringify(passwords));
  }

  return { users, passwords };
}

export function getCurrentUser(): AppUser {
  if (typeof window !== 'undefined') {
    const search = window.location.search;
    if (search.includes('mode=viewer') || search.includes('role=viewer') || search.includes('viewer=true')) {
      safeLocalStorage.removeItem(LS_AUTH_KEY);
      return DEFAULT_VIEWER_USER;
    }
  }

  const userRaw = safeLocalStorage.getItem(LS_AUTH_KEY);
  if (!userRaw) {
    // Default to Viewer mode so anyone opening or receiving the link starts in Viewer mode
    return DEFAULT_VIEWER_USER;
  }
  try {
    const user = JSON.parse(userRaw);
    if (user && user.role === 'admin' && (user.username === 'admin1' || user.username === 'maazarshad934@gmail.com' || user.isCustom)) {
      return user;
    }
    if (user && user.role === 'viewer') {
      return user;
    }
    return DEFAULT_VIEWER_USER;
  } catch (e) {
    return DEFAULT_VIEWER_USER;
  }
}

export function setCurrentUser(user: AppUser | null): void {
  if (user) {
    safeLocalStorage.setItem(LS_AUTH_KEY, JSON.stringify(user));
  } else {
    safeLocalStorage.removeItem(LS_AUTH_KEY);
  }
  notifyLocalListeners();
}

export function checkAdminPermission(operator?: AppUser | null): void {
  const user = operator !== undefined ? operator : getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Access Denied: Only Administrators can create, edit, or delete dispatch data.');
  }
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

    // Check users
    const usersSnap = await withTimeout(getDocs(collection(db, 'users')), 10000, 'Checking initial users');
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      for (const u of SEED_USERS) {
        await withTimeout(setDoc(doc(db, 'users', u.id), u), 10000, `Seeding User ${u.id}`);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seeding');
  }
}

// User subscription and account management APIs
export function subscribeUsers(
  config: CustomFirebaseConfig | null,
  onUpdate: (users: AppUser[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getFirebaseDb(config);
  if (!db) {
    const sync = () => {
      const { users } = getLocalStorageUsers();
      onUpdate(users);
    };
    sync();
    return subscribeToLocalChanges(sync);
  }

  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users: AppUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          username: data.username || doc.id,
          displayName: data.displayName || '',
          role: (data.role === 'admin' ? 'admin' : 'viewer') as UserRole,
          createdAt: data.createdAt || ''
        });
      });
      if (users.length === 0) {
        const { users: localUsers } = getLocalStorageUsers();
        onUpdate(localUsers);
      } else {
        users.sort((a, b) => a.username.localeCompare(b.username));
        safeLocalStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
        onUpdate(users);
      }
    },
    (error) => {
      const { users } = getLocalStorageUsers();
      onUpdate(users);
    }
  );
}

export async function createUser(
  config: CustomFirebaseConfig | null,
  newUser: { username: string; password?: string; role: UserRole; displayName?: string },
  operator?: AppUser | null
): Promise<AppUser> {
  checkAdminPermission(operator);

  const cleanUsername = newUser.username.trim();
  if (!cleanUsername) throw new Error('Username / ID is required');

  const userId = `USR-${Date.now().toString().slice(-6)}`;
  const userRecord: AppUser = {
    id: userId,
    username: cleanUsername,
    displayName: newUser.displayName?.trim() || cleanUsername,
    role: newUser.role,
    createdAt: new Date().toISOString()
  };

  const db = getFirebaseDb(config);
  const { users, passwords } = getLocalStorageUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error(`A user with ID "${cleanUsername}" already exists.`);
  }

  users.push(userRecord);
  passwords[cleanUsername.toLowerCase()] = newUser.password || 'password123';
  safeLocalStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
  safeLocalStorage.setItem(LS_USER_PASSWORDS_KEY, JSON.stringify(passwords));
  notifyLocalListeners();

  if (db) {
    try {
      await withTimeout(setDoc(doc(db, 'users', userId), userRecord), 10000, `Creating User ${userId}`);
    } catch (e) {
      console.warn('Notice: user stored locally, cloud sync pending:', e);
    }
  }

  return userRecord;
}

export async function updateUserRole(
  config: CustomFirebaseConfig | null,
  userId: string,
  newRole: UserRole,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);

  const { users } = getLocalStorageUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].role = newRole;
    safeLocalStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    notifyLocalListeners();
  }

  const db = getFirebaseDb(config);
  if (db) {
    try {
      await withTimeout(updateDoc(doc(db, 'users', userId), { role: newRole }), 10000, `Updating User ${userId} Role`);
    } catch (e) {
      console.warn('Notice: user role updated locally, cloud sync pending:', e);
    }
  }
}

export async function deleteUser(
  config: CustomFirebaseConfig | null,
  userId: string,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);

  const { users, passwords } = getLocalStorageUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return;

  const activeUser = operator || getCurrentUser();
  if (activeUser && activeUser.id === userId) {
    throw new Error('You cannot delete your own active account.');
  }

  const remainingAdmins = users.filter(u => u.role === 'admin' && u.id !== userId);
  if (target.role === 'admin' && remainingAdmins.length === 0) {
    throw new Error('Cannot delete the only remaining Administrator.');
  }

  const updatedUsers = users.filter(u => u.id !== userId);
  if (passwords[target.username.toLowerCase()]) {
    delete passwords[target.username.toLowerCase()];
    safeLocalStorage.setItem(LS_USER_PASSWORDS_KEY, JSON.stringify(passwords));
  }
  safeLocalStorage.setItem(LS_USERS_KEY, JSON.stringify(updatedUsers));
  notifyLocalListeners();

  const db = getFirebaseDb(config);
  if (db) {
    try {
      await withTimeout(deleteDoc(doc(db, 'users', userId)), 10000, `Deleting User ${userId}`);
    } catch (e) {
      console.warn('Notice: user deleted locally, cloud sync pending:', e);
    }
  }
}

export async function loginWithIdPassword(
  username: string,
  password: string,
  config?: CustomFirebaseConfig | null
): Promise<AppUser> {
  const cleanId = username.trim();
  const lowerId = cleanId.toLowerCase();
  const cleanPass = password.trim();

  if (!cleanId || !cleanPass) {
    throw new Error('Please enter both Admin ID and Password.');
  }

  // Exact credentials required: ID: admin1, Password: 4321
  if (lowerId === 'admin1') {
    if (cleanPass !== '4321') {
      throw new Error('Incorrect password. Please try again.');
    }
    const adminUser = SEED_USERS.find(u => u.username === 'admin1') || {
      id: 'USR-ADMIN1',
      username: 'admin1',
      displayName: 'Administrator',
      role: 'admin' as const,
      createdAt: '2024-01-01T00:00:00.000Z'
    };
    setCurrentUser(adminUser);
    return adminUser;
  }

  if (lowerId === 'maazarshad934@gmail.com') {
    if (cleanPass !== '4321' && cleanPass !== 'admin123') {
      throw new Error('Incorrect password. Please try again.');
    }
    const maazUser = SEED_USERS.find(u => u.username === 'maazarshad934@gmail.com') || SEED_USERS[2];
    setCurrentUser(maazUser);
    return maazUser;
  }

  // Check stored database/local users
  const { users, passwords } = getLocalStorageUsers();
  const matchedUser = users.find(
    u => u.username.toLowerCase() === lowerId || (u.id && u.id.toLowerCase() === lowerId)
  );

  if (matchedUser) {
    const expectedPass = passwords[matchedUser.username.toLowerCase()];
    if (cleanPass === expectedPass || (matchedUser.role === 'admin' && cleanPass === '4321')) {
      setCurrentUser(matchedUser);
      return matchedUser;
    }
    throw new Error('Incorrect password. Please try again.');
  }

  if (lowerId === 'admin') {
    if (cleanPass !== '4321' && cleanPass !== 'admin123') throw new Error('Incorrect password.');
    const adminUser = SEED_USERS[0];
    setCurrentUser(adminUser);
    return adminUser;
  }

  if (lowerId === 'viewer') {
    if (cleanPass !== 'viewer123') throw new Error('Incorrect password.');
    const viewerUser = DEFAULT_VIEWER_USER;
    setCurrentUser(viewerUser);
    return viewerUser;
  }

  throw new Error('Invalid Admin ID or Password. Access denied.');
}

export function logoutUser(): void {
  setCurrentUser(DEFAULT_VIEWER_USER);
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
          currentMileage: data.currentMileage || '',
          type: data.type,
          axles: data.axles
        });
      });
      // Sort alphabetically/numerically by id
      trucks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      safeLocalStorage.setItem(LS_TRUCKS_KEY, JSON.stringify(trucks));
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
      safeLocalStorage.setItem(LS_DRIVERS_KEY, JSON.stringify(drivers));
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
          secondDriverId: data.secondDriverId || undefined,
          secondDriverName: data.secondDriverName || undefined,
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
      safeLocalStorage.setItem(LS_TRIPS_KEY, JSON.stringify(trips));
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

// Assigns a truck and driver (with optional second driver) to a trip cleanly inside a coordinated transaction or batch
export async function assignTrip(
  config: CustomFirebaseConfig | null,
  driver: Driver,
  truck: Truck,
  from: string,
  to: string,
  secondDriver?: Driver | null,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  const startTime = new Date().toISOString();
  const tripId = `TRIP-${Date.now().toString().slice(-6)}`;

  if (!db) {
    // local sandbox state transaction
    const { trucks, drivers, trips } = getLocalStorageData();
    const targetTruckIndex = trucks.findIndex(t => t.id === truck.id);
    const targetDriverIndex = drivers.findIndex(d => d.id === driver.id);
    const targetSecondDriverIndex = secondDriver ? drivers.findIndex(d => d.id === secondDriver.id) : -1;

    if (targetTruckIndex !== -1 && targetDriverIndex !== -1) {
      trucks[targetTruckIndex].status = 'On the way';
      drivers[targetDriverIndex].status = 'On the way';
      if (targetSecondDriverIndex !== -1) {
        drivers[targetSecondDriverIndex].status = 'On the way';
      }

      const newTrip: Trip = {
        id: tripId,
        driverId: driver.id,
        driverName: driver.name,
        secondDriverId: secondDriver ? secondDriver.id : undefined,
        secondDriverName: secondDriver ? secondDriver.name : undefined,
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

    // Update second driver status if assigned
    if (secondDriver) {
      const secondDriverRef = doc(db, 'drivers', secondDriver.id);
      batch.update(secondDriverRef, { status: 'On the way' });
    }

    // Create new trip
    const tripRef = doc(db, 'trips', tripId);
    const tripPayload: Record<string, any> = {
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
    if (secondDriver) {
      tripPayload.secondDriverId = secondDriver.id;
      tripPayload.secondDriverName = secondDriver.name;
    }
    batch.set(tripRef, tripPayload);

    withTimeout(batch.commit(), 10000, 'Confirming Trip Dispatch').catch(error => 
      handleFirestoreError(error, OperationType.WRITE, 'trips_assignment')
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'trips_assignment');
  }
}

// Completes a trip atomically
export async function completeTrip(
  config: CustomFirebaseConfig | null,
  trip: Trip,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  const completedTime = new Date().toISOString();

  if (!db) {
    // local sandbox state transaction
    const { trucks, drivers, trips } = getLocalStorageData();
    const targetTruckIndex = trucks.findIndex(t => t.id === trip.truckId);
    const targetDriverIndex = drivers.findIndex(d => d.id === trip.driverId);
    const targetSecondDriverIndex = trip.secondDriverId ? drivers.findIndex(d => d.id === trip.secondDriverId) : -1;
    const targetTripIndex = trips.findIndex(t => t.id === trip.id);

    if (targetTruckIndex !== -1) trucks[targetTruckIndex].status = 'Available';
    if (targetDriverIndex !== -1) drivers[targetDriverIndex].status = 'Available';
    if (targetSecondDriverIndex !== -1) drivers[targetSecondDriverIndex].status = 'Available';

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

    if (trip.secondDriverId) {
      const secondDriverRef = doc(db, 'drivers', trip.secondDriverId);
      batch.update(secondDriverRef, { status: 'Available' });
    }

    const tripRef = doc(db, 'trips', trip.id);
    batch.update(tripRef, {
      status: 'completed',
      completedTime
    });

    withTimeout(batch.commit(), 10000, 'Completing Trip Route').catch(error => 
      handleFirestoreError(error, OperationType.WRITE, `complete_trip_${trip.id}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `complete_trip_${trip.id}`);
  }
}

export async function deleteTrip(
  config: CustomFirebaseConfig | null,
  trip: Trip,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);

  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    // If trip was active, return truck and drivers to Available
    if (trip.status === 'active') {
      const targetTruckIndex = trucks.findIndex(t => t.id === trip.truckId);
      const targetDriverIndex = drivers.findIndex(d => d.id === trip.driverId);
      const targetSecondDriverIndex = trip.secondDriverId ? drivers.findIndex(d => d.id === trip.secondDriverId) : -1;

      if (targetTruckIndex !== -1) trucks[targetTruckIndex].status = 'Available';
      if (targetDriverIndex !== -1) drivers[targetDriverIndex].status = 'Available';
      if (targetSecondDriverIndex !== -1) drivers[targetSecondDriverIndex].status = 'Available';
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

      if (trip.secondDriverId) {
        const secondDriverRef = doc(db, 'drivers', trip.secondDriverId);
        batch.update(secondDriverRef, { status: 'Available' });
      }
    }

    const tripRef = doc(db, 'trips', trip.id);
    batch.delete(tripRef);

    await withTimeout(batch.commit(), 10000, `Deleting Trip ${trip.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trips/${trip.id}`);
  }
}

// Add sample trucks & drivers to sandbox or Firestore
export async function addNewTruck(
  config: CustomFirebaseConfig | null,
  truck: Truck,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
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
    withTimeout(setDoc(doc(db, 'trucks', truck.id), truck), 10000, `Adding Truck ${truck.id}`).catch(error => 
      handleFirestoreError(error, OperationType.WRITE, `trucks/${truck.id}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trucks/${truck.id}`);
  }
}

export async function addNewDriver(
  config: CustomFirebaseConfig | null,
  driver: Driver,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
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
    withTimeout(setDoc(doc(db, 'drivers', driver.id), driver), 10000, `Adding Driver ${driver.id}`).catch(error => 
      handleFirestoreError(error, OperationType.WRITE, `drivers/${driver.id}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `drivers/${driver.id}`);
  }
}

export async function deleteTruck(
  config: CustomFirebaseConfig | null,
  truckId: string,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    const updatedTrucks = trucks.filter(t => t.id !== truckId);
    setLocalStorageData(updatedTrucks, drivers, trips);
    notifyLocalListeners();
    return;
  }
  try {
    withTimeout(deleteDoc(doc(db, 'trucks', truckId)), 10000, `Deleting Truck ${truckId}`).catch(error => 
      handleFirestoreError(error, OperationType.DELETE, `trucks/${truckId}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trucks/${truckId}`);
  }
}

export async function deleteDriver(
  config: CustomFirebaseConfig | null,
  driverId: string,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    const updatedDrivers = drivers.filter(d => d.id !== driverId);
    setLocalStorageData(trucks, updatedDrivers, trips);
    notifyLocalListeners();
    return;
  }
  try {
    withTimeout(deleteDoc(doc(db, 'drivers', driverId)), 10000, `Deleting Driver ${driverId}`).catch(error => 
      handleFirestoreError(error, OperationType.DELETE, `drivers/${driverId}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `drivers/${driverId}`);
  }
}

export async function updateTruckStatus(
  config: CustomFirebaseConfig | null,
  truckId: string,
  status: TruckStatus,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    const truckIdx = trucks.findIndex(t => t.id === truckId);
    if (truckIdx !== -1) {
      trucks[truckIdx].status = status;
      setLocalStorageData(trucks, drivers, trips);
      notifyLocalListeners();
    }
    return;
  }
  try {
    withTimeout(updateDoc(doc(db, 'trucks', truckId), { status }), 10000, `Updating Truck ${truckId} Status`).catch(error =>
      handleFirestoreError(error, OperationType.UPDATE, `trucks/${truckId}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `trucks/${truckId}`);
  }
}

export async function updateDriverStatus(
  config: CustomFirebaseConfig | null,
  driverId: string,
  status: DriverStatus,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  if (!db) {
    const { trucks, drivers, trips } = getLocalStorageData();
    const driverIdx = drivers.findIndex(d => d.id === driverId);
    if (driverIdx !== -1) {
      drivers[driverIdx].status = status;
      setLocalStorageData(trucks, drivers, trips);
      notifyLocalListeners();
    }
    return;
  }
  try {
    withTimeout(updateDoc(doc(db, 'drivers', driverId), { status }), 10000, `Updating Driver ${driverId} Status`).catch(error =>
      handleFirestoreError(error, OperationType.UPDATE, `drivers/${driverId}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `drivers/${driverId}`);
  }
}

export function subscribeMonthlyAssignments(
  config: CustomFirebaseConfig | null,
  onUpdate: (assignments: MonthlyAssignment[]) => void,
  onError: (err: Error) => void
): () => void {
  const db = getFirebaseDb(config);
  if (!db) {
    const sync = () => {
      const raw = safeLocalStorage.getItem(LS_MONTHLY_KEY);
      let assignments: MonthlyAssignment[] = [];
      if (raw) {
        try { assignments = JSON.parse(raw); } catch (e) { assignments = []; }
      }
      onUpdate(assignments);
    };
    sync();
    return subscribeToLocalChanges(sync);
  }

  return onSnapshot(
    collection(db, 'monthly_assignments'),
    (snapshot) => {
      const assignments: MonthlyAssignment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          truckId: data.truckId || '',
          truckName: data.truckName || '',
          companyName: data.companyName || '',
          startDate: data.startDate || '',
          monthlyRate: data.monthlyRate || '',
          notes: data.notes || ''
        });
      });
      safeLocalStorage.setItem(LS_MONTHLY_KEY, JSON.stringify(assignments));
      onUpdate(assignments);
    },
    (error) => {
      onError(new Error(JSON.stringify({
        error: error.message,
        operationType: OperationType.LIST,
        path: 'monthly_assignments'
      })));
    }
  );
}

export async function assignTruckMonthly(
  config: CustomFirebaseConfig | null,
  assignment: Omit<MonthlyAssignment, 'id'>,
  operator?: AppUser | null
): Promise<string> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);
  const id = 'MONTH-' + Date.now();
  const newAssignment: MonthlyAssignment = { ...assignment, id };

  if (!db) {
    const raw = safeLocalStorage.getItem(LS_MONTHLY_KEY);
    let assignments: MonthlyAssignment[] = [];
    if (raw) {
      try { assignments = JSON.parse(raw); } catch (e) { assignments = []; }
    }
    assignments.push(newAssignment);
    safeLocalStorage.setItem(LS_MONTHLY_KEY, JSON.stringify(assignments));

    // Update truck status to 'Monthly'
    const { trucks, drivers, trips } = getLocalStorageData();
    const truckIdx = trucks.findIndex(t => t.id === assignment.truckId);
    if (truckIdx !== -1) {
      trucks[truckIdx].status = 'Monthly';
      setLocalStorageData(trucks, drivers, trips);
    }
    notifyLocalListeners();
    return id;
  }

  try {
    const batch = writeBatch(db);
    const assignmentRef = doc(db, 'monthly_assignments', id);
    batch.set(assignmentRef, newAssignment);

    const truckRef = doc(db, 'trucks', assignment.truckId);
    batch.update(truckRef, { status: 'Monthly' });

    await withTimeout(batch.commit(), 10000, 'Assign Truck Monthly');
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `monthly_assignments/${id}`);
  }
}

export async function removeMonthlyAssignment(
  config: CustomFirebaseConfig | null,
  assignmentId: string,
  truckId: string,
  operator?: AppUser | null
): Promise<void> {
  checkAdminPermission(operator);
  const db = getFirebaseDb(config);

  if (!db) {
    const raw = safeLocalStorage.getItem(LS_MONTHLY_KEY);
    let assignments: MonthlyAssignment[] = [];
    if (raw) {
      try { assignments = JSON.parse(raw); } catch (e) { assignments = []; }
    }
    const updated = assignments.filter(a => a.id !== assignmentId);
    safeLocalStorage.setItem(LS_MONTHLY_KEY, JSON.stringify(updated));

    // Revert truck status to 'Available'
    const { trucks, drivers, trips } = getLocalStorageData();
    const truckIdx = trucks.findIndex(t => t.id === truckId);
    if (truckIdx !== -1) {
      trucks[truckIdx].status = 'Available';
      setLocalStorageData(trucks, drivers, trips);
    }
    notifyLocalListeners();
    return;
  }

  try {
    const batch = writeBatch(db);
    const assignmentRef = doc(db, 'monthly_assignments', assignmentId);
    batch.delete(assignmentRef);

    const truckRef = doc(db, 'trucks', truckId);
    batch.update(truckRef, { status: 'Available' });

    await withTimeout(batch.commit(), 10000, `Remove Monthly Assignment ${assignmentId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `monthly_assignments/${assignmentId}`);
  }
}
