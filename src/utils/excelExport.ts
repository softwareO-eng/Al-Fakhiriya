/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Trip, Truck } from '../types';

export interface ExportFilterOptions {
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Custom' | 'All';
  customDate?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  truckId?: string;
}

export function filterTripsForReport(trips: Trip[], options: ExportFilterOptions): Trip[] {
  const now = new Date();

  return trips.filter((trip) => {
    // Filter by truck if specified
    if (options.truckId && options.truckId !== 'all' && trip.truckId !== options.truckId) {
      return false;
    }

    const tripDateStr = trip.completedTime || trip.startTime;
    if (!tripDateStr) return false;
    const tripDate = new Date(tripDateStr);

    if (options.period === 'Daily') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tripDay = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
      return tripDay.getTime() === today.getTime();
    }

    if (options.period === 'Weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return tripDate >= oneWeekAgo && tripDate <= now;
    }

    if (options.period === 'Monthly') {
      return (
        tripDate.getMonth() === now.getMonth() &&
        tripDate.getFullYear() === now.getFullYear()
      );
    }

    if (options.period === 'Custom') {
      if (options.customDate) {
        const targetDayStr = options.customDate;
        const tripDayStr = tripDate.toISOString().slice(0, 10);
        return tripDayStr === targetDayStr;
      }
      if (options.startDate && options.endDate) {
        const start = new Date(options.startDate);
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        return tripDate >= start && tripDate <= end;
      }
    }

    return true; // 'All'
  });
}

export function exportTripsToExcel(
  trips: Trip[],
  trucks: Truck[] = [],
  options: ExportFilterOptions = { period: 'All' }
) {
  const filteredTrips = filterTripsForReport(trips, options);

  if (filteredTrips.length === 0) {
    throw new Error('No trips found for the selected filter criteria.');
  }

  // Build trucks map for quick detail lookup
  const truckMap = new Map<string, Truck>();
  trucks.forEach((t) => truckMap.set(t.id, t));

  // Prepare data rows for Excel sheet
  const rows = filteredTrips.map((trip, index) => {
    const truck = truckMap.get(trip.truckId);
    const startDateFormatted = trip.startTime
      ? new Date(trip.startTime).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : 'N/A';

    const completedDateFormatted = trip.completedTime
      ? new Date(trip.completedTime).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : trip.status === 'active'
      ? 'In Progress'
      : 'N/A';

    return {
      '#': index + 1,
      'Trip ID': trip.id,
      'Status': trip.status === 'completed' ? 'Delivered' : 'In Transit',
      'Rig / Truck ID': trip.truckId,
      'Truck Name/Model': trip.truckName || truck?.name || 'Heavy Hauler',
      'Truck Type': truck?.type || 'Standard',
      'Axles': truck?.axles ?? 3,
      'Lead Driver': trip.driverName,
      'Lead Driver ID': trip.driverId,
      'Co-Pilot (2nd Driver)': trip.secondDriverName || 'Solo Run',
      'Co-Pilot ID': trip.secondDriverId || '—',
      'Origin (From)': trip.from,
      'Destination (To)': trip.to,
      'Departure Time': startDateFormatted,
      'Delivery / Completed Time': completedDateFormatted,
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 14 }, // Trip ID
    { wch: 12 }, // Status
    { wch: 14 }, // Truck ID
    { wch: 20 }, // Truck Name
    { wch: 14 }, // Truck Type
    { wch: 8 },  // Axles
    { wch: 20 }, // Lead Driver
    { wch: 14 }, // Driver ID
    { wch: 20 }, // Co-Pilot
    { wch: 14 }, // Co-Pilot ID
    { wch: 28 }, // Origin
    { wch: 28 }, // Destination
    { wch: 22 }, // Departure Time
    { wch: 22 }, // Delivery Time
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trip Manifest Report');

  // Summary sheet
  const activeCount = filteredTrips.filter((t) => t.status === 'active').length;
  const completedCount = filteredTrips.filter((t) => t.status === 'completed').length;
  const dualPilotCount = filteredTrips.filter((t) => Boolean(t.secondDriverId)).length;

  const summaryData = [
    { Metric: 'Report Type', Value: options.period },
    { Metric: 'Generated At', Value: new Date().toLocaleString() },
    { Metric: 'Total Trips', Value: filteredTrips.length },
    { Metric: 'Completed (Delivered)', Value: completedCount },
    { Metric: 'Active (In Transit)', Value: activeCount },
    { Metric: 'Dual Pilot Missions', Value: dualPilotCount },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // Generate file name
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `KFT_Transport_Trip_Report_${options.period}_${dateStr}.xlsx`;

  // Write and trigger download in browser
  XLSX.writeFile(workbook, fileName);
}
