import React, { useState } from 'react';
import { Bluetooth, Menu, X, Cpu, RefreshCw, Car, LogOut } from 'lucide-react';
import { ConnectionStatus } from '../types/obd';
import { bleService } from '../services/bleService';

interface HeaderProps {
  status: ConnectionStatus;
  deviceName?: string;
  onOpenConnectModal: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  deviceName,
  onOpenConnectModal,
  title,
  showBack,
  onBack
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isConnected = status === 'connected';
  const isSimulating = bleService.isSimulating();
  const isVehicleLinked = bleService.isVehicleLinked();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 py-2.5 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Left: Logo Bách Khoa TP.HCM & Back button OR Status */}
          {showBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm hover:opacity-80 transition active:scale-95 py-1"
            >
              <svg className="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Quay lại</span>
            </button>
          ) : (
            <div 
              onClick={onOpenConnectModal}
              className="flex items-center gap-2 cursor-pointer group active:opacity-80 transition"
            >
              {/* Logo Bách Khoa TP.HCM */}
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200/80 p-0.5 shadow-2xs shrink-0 flex items-center justify-center">
                <img 
                  src="/logo-bachkhoa.png" 
                  alt="Logo Bách Khoa TP.HCM" 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Status Badge */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    isVehicleLinked
                      ? 'bg-emerald-500 animate-pulse'
                      : isConnected
                      ? 'bg-blue-500 animate-pulse' 
                      : status === 'connecting' || status === 'scanning'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-red-500'
                  }`} />
                  <span className={`text-[11px] font-black tracking-wider uppercase font-mono ${
                    isVehicleLinked
                      ? 'text-emerald-700'
                      : isConnected
                      ? 'text-blue-700' 
                      : status === 'connecting' || status === 'scanning'
                      ? 'text-amber-600'
                      : 'text-red-500'
                  }`}>
                    {isVehicleLinked 
                      ? (isSimulating ? 'SIMULATOR: XPANDER' : 'XE ĐÃ LIÊN KẾT: XPANDER')
                      : isConnected
                      ? 'ĐÃ KẾT NỐI ESP32 (CHỜ XE)'
                      : status === 'connecting'
                      ? 'ĐANG KẾT NỐI...'
                      : status === 'scanning'
                      ? 'QUÉT BLE...'
                      : 'CHƯA KẾT NỐI ESP32'}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  {isVehicleLinked 
                    ? 'ĐH BÁCH KHOA TP.HCM • XPANDER 2020' 
                    : isConnected
                    ? 'ĐH BÁCH KHOA TP.HCM • CHỜ BẬT KHÓA XE'
                    : 'ĐH BÁCH KHOA TP.HCM • OBD-II SYSTEM'}
                </span>
              </div>
            </div>
          )}

          {/* Center Title (nếu ở màn hình con) */}
          {title && (
            <h1 className="text-sm font-bold text-slate-800 text-center flex-1 truncate">
              {title}
            </h1>
          )}

          {/* Right: Hamburger Menu Icon */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition active:scale-95 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* Drawer / Menu Dialog */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-80 bg-white h-full shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {/* Header Drawer với Logo Bách Khoa */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 p-1 shadow-xs flex items-center justify-center">
                    <img 
                      src="/logo-bachkhoa.png" 
                      alt="Logo Bách Khoa" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-blue-900 text-sm leading-tight">
                      ĐH BÁCH KHOA TP.HCM
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Bộ môn Kĩ thuật ô tô</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thông tin xe chẩn đoán: CHỈ HIỆN ẢNH KHI ĐÃ LIÊN KẾT ĐƯỢC VỚI XE */}
              {isVehicleLinked ? (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3 animate-in fade-in duration-300">
                  <div className="w-16 h-10 bg-white rounded-lg p-0.5 border border-emerald-200 overflow-hidden flex items-center justify-center shrink-0">
                    <img src="/car-xpander.png" alt="Mitsubishi Xpander" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Xe đã liên kết:
                    </span>
                    <strong className="text-xs font-bold text-slate-800 block">
                      Mitsubishi Xpander 2020
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">4A91 1.5L MIVEC</span>
                  </div>
                </div>
              ) : isConnected ? (
                <div className="mt-4 p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center gap-3">
                  <div className="w-12 h-10 bg-white rounded-lg border border-blue-200 flex items-center justify-center shrink-0 text-blue-600 shadow-2xs">
                    <Cpu className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      Thiết bị:
                    </span>
                    <strong className="text-xs font-bold text-slate-800 block">
                      {bleService.getConnectedDevice()?.name || 'ESP32-OBD2'}
                    </strong>
                    <span className="text-[10px] text-slate-500">Chờ kết nối ECU xe...</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <div className="w-12 h-10 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center shrink-0 text-slate-400">
                    <Car className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Trạng thái xe:
                    </span>
                    <strong className="text-xs font-bold text-slate-700 block">
                      Chưa liên kết xe
                    </strong>
                    <span className="text-[10px] text-slate-400">Cần kết nối Bluetooth</span>
                  </div>
                </div>
              )}

              {/* Thông tin trạng thái kết nối */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Chế độ hoạt động:</span>
                  <span className="font-semibold text-slate-800">
                    {isSimulating ? 'Giả lập ESP32' : isConnected ? 'Bluetooth BLE thật' : 'Chưa kết nối'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Giao thức CAN Bus:</span>
                  <span className="font-semibold text-slate-800">ISO 15765-4 (500k)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Phần cứng:</span>
                  <span className="font-semibold text-slate-800">ESP32 + SN65HVD230</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-5 space-y-2">
                {isConnected && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      bleService.disconnect();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Ngắt kết nối (Disconnect)</span>
                    </div>
                    <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
                      {isVehicleLinked ? 'Đã nối xe' : 'Đã nối ESP32'}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenConnectModal();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-100 transition"
                >
                  <Bluetooth className="w-4 h-4 text-blue-600" />
                  <span>Quét Bluetooth ESP32 (BLE)</span>
                </button>

                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    if (isSimulating) {
                      bleService.disconnect();
                    } else {
                      await bleService.connectSimulator();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-100 transition"
                >
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span>{isSimulating ? 'Tắt chế độ Giả lập' : 'Bật Giả lập ESP32 Xpander'}</span>
                </button>

                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    if ((window as any).forceUpdateApp) {
                      await (window as any).forceUpdateApp();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin-hover" />
                  <span>Cập nhật phiên bản mới nhất</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <img src="/logo-bachkhoa.png" alt="BK" className="w-4 h-4 object-contain" />
                <p className="text-[11px] font-bold text-blue-900">HCMUT AUTOMOTIVE LAB</p>
              </div>
              <p className="text-[10px] text-slate-400">Đồ án Thiết bị Chẩn đoán Ô tô OBD-II ESP32</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
