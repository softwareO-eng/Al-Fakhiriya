import React, { useState } from 'react';
import { Calendar, Building, DollarSign, X, CheckCircle, ShieldAlert } from 'lucide-react';
import { Truck } from '../types';

interface MonthlyAssignmentModalProps {
  isOpen: boolean;
  truck: Truck | null;
  onClose: () => void;
  onConfirm: (data: { companyName: string; startDate: string; monthlyRate: string; notes: string }) => Promise<void>;
}

export default function MonthlyAssignmentModal({
  isOpen,
  truck,
  onClose,
  onConfirm
}: MonthlyAssignmentModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyRate, setMonthlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !truck) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please enter the company name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConfirm({
        companyName: companyName.trim(),
        startDate,
        monthlyRate: monthlyRate.trim(),
        notes: notes.trim()
      });
      setCompanyName('');
      setMonthlyRate('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign truck to monthly operation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-800 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">Send Truck on Monthly Basis</h3>
              <p className="text-xs text-indigo-200 font-mono">Rig: {truck.id} ({truck.name})</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name (To Whom Truck is Sent) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Logistics Corp"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Rate ($) (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <DollarSign className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(e.target.value)}
                  placeholder="e.g. 12,000 / mo"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contract Notes / Terms (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Full maintenance covered by lessee, 6-month minimum agreement."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
            />
          </div>

          <div className="pt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Confirm Monthly'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
