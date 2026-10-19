import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, ChevronRight, Cpu, ArrowLeft, Car, CheckCircle2 } from 'lucide-react';
import { ScreenType, ConnectionStatus } from '../types/obd';
import { bleService } from '../services/bleService';

interface ObdHubScreenProps {
  status: ConnectionStatus;
  onNavigate: (screen: ScreenType) => void;
  onBack: () => void;
}

export const ObdHubScreen: React.FC<ObdHubScreenProps> = ({
  status,
  onNavigate,
  onBack
}) => {
  const isConnected = status === 'connected';
  const [isVehicleLinked, setIsVehicleLinked] = useState(bleService.isVehicleLinked());

  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange((linked) => {
      setIsVehicleLinked(linked);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Top Banner: Logo Bách Khoa TP.HCM & Trạng thái OBD-II */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-900 block leading-tight">
                TRƯỜNG ĐẠI HỌC BÁCH KHOA - ĐHQG TP.HCM
              </span>
              <span className="text-[9px] text-slate-500">Khoa Kỹ thuật Giao thông • Bộ môn Kĩ thuật ô tô</span>
            </div>
          </div>

          {isVehicleLinked ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              <img src="/car-xpander.png" alt="Xpander" className="w-8 h-5 object-contain" />
              <span className="text-[10px] font-bold text-emerald-800">Xpander 2020</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-bold">Đã nối ESP32 (Chờ xe)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span className="text-[10px] font-bold">Chưa liên kết</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">Mục chẩn đoán OBD-II</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn chức năng giao tiếp với hộp điều khiển động cơ ECU của xe
            </p>
          </div>
        </div>
      </div>

      {/* DANH SÁCH 2 MỤC CHÍNH BÊN TRONG MỤC OBD II */}
      <div className="space-y-3 pt-1">
        {/* Mục 1: Chẩn đoán Mã lỗi (DTCs) */}
        <div
          onClick={() => onNavigate('diagnostics')}
          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer active:scale-[0.99] group"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <img src="/logo-bachkhoa.png" alt="BK" className="w-3.5 h-3.5 object-contain" />
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Chẩn đoán Mã lỗi (DTCs)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isVehicleLinked 
                  ? 'Quét mã lỗi ECU xe Xpander, xóa mã lỗi và tắt đèn Check Engine (MIL).'
                  : 'Quét mã lỗi ECU xe, xóa mã lỗi và tắt đèn Check Engine (MIL).'}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Đọc mã lỗi lưu
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                  Xóa lỗi & MIL
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-300 self-center group-hover:text-amber-500 transition-colors" />
          </div>
        </div>

        {/* Mục 2: Thông tin xe & Đọc số VIN */}
        <div
          onClick={() => onNavigate('vehicle_info')}
          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer active:scale-[0.99] group"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <img src="/logo-bachkhoa.png" alt="BK" className="w-3.5 h-3.5 object-contain" />
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Thông tin xe & Đọc số VIN
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Trích xuất số khung VIN 17 ký tự từ hộp ECU của xe theo chuẩn quốc tế ISO 3779.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Đọc số khung xe VIN
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  17 Ký tự chuẩn
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-300 self-center group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Technical Footnote */}
      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
        <Cpu className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Giao tiếp trực tiếp qua vi điều khiển ESP32 và chip thu phát CAN SN65HVD230 theo chuẩn mạng xe <strong>ISO 15765-4 (500kbps)</strong>.
        </p>
      </div>

      {/* Nút quay lại */}
      <button
        onClick={onBack}
        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>QUAY LẠI TRANG CHỦ</span>
      </button>
    </div>
  );
};
