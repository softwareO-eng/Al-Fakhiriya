import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-center space-x-3 text-rose-600 mb-3">
            <div className="bg-rose-50 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          </div>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-transform active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
