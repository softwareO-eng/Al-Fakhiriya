/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TruckStatus = 'Available' | 'On the way';
export type DriverStatus = 'Available' | 'On the way';
export type TripStatus = 'active' | 'completed';

export interface Truck {
  id: string; // Document ID (e.g., "TRK-101")
  name: string;
  status: TruckStatus;
  model?: string;
  year?: number | string;
  licensePlate?: string;
  capacity?: string;
  fuelType?: string;
  currentMileage?: string | number;
  type?: 'Flat Bed' | 'Low Bed';
  axles?: 3 | 4 | 5;
}

export interface Driver {
  id: string; // Document ID (e.g., "DRV-001")
  name: string;
  licenseNumber: string;
  phoneNumber: string;
  status: DriverStatus;
}

export interface Trip {
  id: string; // Document ID
  driverId: string;
  driverName: string;
  truckId: string;
  truckName: string;
  from: string;
  to: string;
  startTime: string; // ISO String or Firestore formatted string for stability
  completedTime?: string; // ISO string when completed
  status: TripStatus;
}

export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  measurementId?: string;
}
