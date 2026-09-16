/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Trip, Truck } from '../types';
import { exportTripsToExcel, filterTripsForReport } from '../utils/excelExport';
import { FileSpreadsheet, Download, Calendar, Filter, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExcelReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  trucks: Truck[];
}

export default function ExcelReportModal({
  isOpen,
  onClose,
  trips,
  trucks,
}: ExcelReportModalProps) {
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom' | 'All'>('Daily');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTruckId, setSelectedTruckId] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const matchedTrips = useMemo(() => {
    return filterTripsForReport(trips, {
      period,
      startDate: period === 'Custom' ? startDate : undefined,
      endDate: period === 'Custom' ? endDate : undefined,
      truckId: selectedTruckId,
    });
  }, [trips, period, startDate, endDate, selectedTruckId]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      setStatusMessage(null);
      exportTripsToExcel(trips, trucks, {
        period,
        startDate: period === 'Custom' ? startDate : undefined,
        endDate: period === 'Custom' ? endDate : undefined,
        truckId: selectedTruckId,
      });
      setStatusMessage({
        type: 'success',
        text: `Successfully exported ${matchedTrips.length} trip record(s) to Excel!`,
      });
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1200);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Export failed. Please check filters.',
      });
    }
  };

  return (
    <div
      id="excel-report-modal-overlay"
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
    >
      <div
        id="excel-report-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-emerald-800 px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/80 rounded-xl">
              <FileSpreadsheet className="h-6 w-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Export Trip Report (Excel)</h2>
              <p className="text-[11px] text-emerald-200">
                Generate professional .xlsx spreadsheets for audits & logistics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-emerald-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Period selector tabs */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Reporting Period
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['Daily', 'Weekly', 'Monthly', 'Custom', 'All'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    setStatusMessage(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    period === p
                      ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          {period === 'Custom' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Custom Date Range</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Rig / Truck filter */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter by Rig / Truck (Optional)</span>
            </label>
            <select
              value={selectedTruckId}
              onChange={(e) => setSelectedTruckId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
            >
              <option value="all">All Rigs ({trucks.length} total trucks)</option>
              {trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.id} — {truck.name} ({truck.status})
                </option>
              ))}
            </select>
          </div>

          {/* Report Preview Summary Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-emerald-950">
                Ready to Export: <span className="font-mono text-emerald-700">{matchedTrips.length}</span> Trip(s)
              </div>
              <div className="text-[11px] text-emerald-700">
                Includes Lead & Co-Pilot names, vehicle specs, routes, and timestamps.
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-200/80 text-emerald-900 px-2.5 py-1 rounded-md">
              .XLSX
            </span>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-excel-export-button"
              onClick={handleExport}
              disabled={matchedTrips.length === 0}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
            >
              <Download className="h-4 w-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
