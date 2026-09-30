import React, { useState } from 'react';
import { Check, Info, MapPin } from 'lucide-react';
import { ToolType } from '../types/obd';

interface PairingGuideScreenProps {
  onReadyToPair: () => void;
  onCancel: () => void;
  onFindPort: () => void;
}

export const PairingGuideScreen: React.FC<PairingGuideScreenProps> = ({
  onReadyToPair,
  onCancel,
  onFindPort
}) => {
  const [toolType, setToolType] = useState<ToolType>('handheld');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-5 py-4 min-h-[calc(100vh-60px)] pb-10">
      <div>
        {/* Logo Bách Khoa TP.HCM & Xe Mitsubishi Xpander Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg p-0.5 border border-slate-200 shadow-2xs flex items-center justify-center">
              <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-tight block">
                ĐH BÁCH KHOA TP.HCM
              </span>
              <span className="text-[9px] text-slate-500">Quy trình ghép nối thiết bị chẩn đoán</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[10px] font-bold text-blue-800">OBD-II CAN</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">
          Ready to pair?
        </h2>

        {/* Segmented Switch: Dongle | Handheld Tool */}
        <div className="p-0.5 bg-slate-100 rounded-xl border border-slate-200/80 flex items-center mb-6">
          <button
            onClick={() => setToolType('dongle')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              toolType === 'dongle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Dongle
          </button>
          <button
            onClick={() => setToolType('handheld')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              toolType === 'handheld'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Handheld Tool
          </button>
        </div>

        {/* Vector Illustration matching Image 1 */}
        <div className="flex justify-center items-center my-4">
          <div className="w-56 h-36">
            <svg viewBox="0 0 240 180" fill="none" className="w-full h-full">
              <rect x="25" y="35" width="45" height="35" rx="5" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
              <rect x="33" y="24" width="29" height="11" rx="2" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
              <line x1="47.5" y1="70" x2="47.5" y2="80" stroke="#1D70B8" strokeWidth="3" />
              <path
                d="M 47.5 80 C 47.5 130, 95 150, 100 80 C 105 30, 130 30, 140 60"
                stroke="#1D70B8"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <rect x="135" y="55" width="42" height="85" rx="10" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
              <rect x="142" y="65" width="28" height="26" rx="3" stroke="#1D70B8" strokeWidth="2.5" fill="#F8FAFC" />
              <circle cx="150" cy="102" r="2.5" fill="#1D70B8" />
              <circle cx="162" cy="102" r="2.5" fill="#1D70B8" />
              <circle cx="156" cy="112" r="3.5" fill="#1D70B8" />
              <rect x="172" y="85" width="48" height="38" rx="6" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
              <circle cx="196" cy="104" r="3.5" fill="#1D70B8" />
              <rect x="194" y="90" width="4" height="2" rx="1" fill="#1D70B8" />
            </svg>
          </div>
        </div>

        {/* Thông báo vị trí cổng OBD trên xe Mitsubishi Xpander */}
        <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center gap-2 mb-4 text-xs text-blue-900">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Vị trí cổng OBD-II:</strong> Cổng 16 chân thường nằm dưới vô lăng bên tài (ngay góc trên bàn đạp chân ga).
          </span>
        </div>

        {/* Checklist with Green Checkmarks */}
        <div className="space-y-3.5 px-1">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-500 shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <p className="text-sm text-slate-800 font-medium">
              The tool is securely plugged in to the OBD port
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-500 shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <p className="text-sm text-slate-800 font-medium">
              The ignition is ON (Bật chìa khóa xe nấc ON)
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-500 shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <p className="text-sm text-slate-800 font-medium">
              I'm standing next to the vehicle
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-500 shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <p className="text-sm text-slate-800 font-medium">
              My tool has finished scanning my vehicle
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Actions Area */}
      <div className="space-y-2.5 pt-4">
        <div className="flex items-center justify-between px-1 py-1">
          <label htmlFor="dontShow" className="text-xs text-slate-700 cursor-pointer">
            Don't show this again
          </label>
          <input
            id="dontShow"
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        <button
          onClick={onReadyToPair}
          className="w-full py-3.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-xl text-base font-semibold shadow-sm transition active:scale-[0.98]"
        >
          Ready to Pair
        </button>

        <button
          onClick={onFindPort}
          className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#1976D2] border border-slate-200 rounded-xl text-sm font-semibold shadow-2xs transition active:scale-[0.98]"
        >
          Find My OBD Port (Xem vị trí cổng OBD)
        </button>

        <button
          onClick={onCancel}
          className="w-full py-1.5 text-center text-[#1976D2] hover:text-blue-800 text-sm font-semibold transition active:opacity-70"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
