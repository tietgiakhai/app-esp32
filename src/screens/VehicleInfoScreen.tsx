import React, { useState, useEffect } from 'react';
import { ConnectionStatus, VehicleInfo } from '../types/obd';
import { ObdProtocol } from '../services/obdProtocol';
import { bleService } from '../services/bleService';
import { ShieldCheck, RefreshCw, Car, Battery, Globe, Calendar, Copy, Check, Gauge, Settings, Lock, Unlock, AlertCircle, Cpu, CheckCircle2, Bluetooth, LogOut } from 'lucide-react';

interface VehicleInfoScreenProps {
  status: ConnectionStatus;
  onConnectPrompt: () => void;
}

export const VehicleInfoScreen: React.FC<VehicleInfoScreenProps> = ({
  status,
  onConnectPrompt
}) => {
  const [info, setInfo] = useState<VehicleInfo | null>(ObdProtocol.cachedVehicleInfo);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected = status === 'connected';
  const [isVehicleLinked, setIsVehicleLinked] = useState<boolean>(bleService.isVehicleLinked() && !!info?.isReadFromEcu);

  // Lắng nghe thay đổi trạng thái liên kết xe
  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange(linked => {
      setIsVehicleLinked(linked && !!ObdProtocol.cachedVehicleInfo);
      if (linked && ObdProtocol.cachedVehicleInfo) {
        setInfo(ObdProtocol.cachedVehicleInfo);
      }
    });
    return unsub;
  }, []);

  // Đồng bộ với cache nếu đã từng đọc
  useEffect(() => {
    if (ObdProtocol.cachedVehicleInfo && isVehicleLinked) {
      setInfo(ObdProtocol.cachedVehicleInfo);
    }
  }, [isConnected, isVehicleLinked]);

  // Hành động đọc số VIN từ ECU
  const handleReadVin = async () => {
    if (!isConnected) {
      onConnectPrompt();
      return;
    }
    setLoading(true);
    try {
      const details = await ObdProtocol.getVehicleDetails();
      setInfo(details);
    } catch (e) {
      console.error('Lỗi đọc VIN:', e);
    } finally {
      setLoading(false);
    }
  };

  const copyVin = () => {
    if (info?.vin) {
      navigator.clipboard.writeText(info.vin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4 pb-28">
      {/* Brand Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
            <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-900 block leading-tight">
              ĐH BÁCH KHOA TP.HCM
            </span>
            <span className="text-[9px] text-slate-500">Tra cứu Số khung & Thông tin xe</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReadVin}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang đọc ECU...' : (info?.isReadFromEcu ? 'Đọc lại VIN' : 'Đọc số VIN')}</span>
          </button>
          {isConnected && (
            <button
              onClick={() => bleService.disconnect()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs"
              title="Ngắt kết nối"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Showcase: CHỈ HIỆN ẢNH XE KHI ĐÃ LIÊN KẾT ĐƯỢC VỚI XE */}
      {isVehicleLinked ? (
        /* TRƯỜNG HỢP 1: ĐÃ LIÊN KẾT VÀ ĐỌC ĐƯỢC TỪ XE: HIỆN ẢNH XE MITSUBISHI XPANDER 2020 MÀU ĐEN */
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute right-[-10px] top-[-10px] w-28 h-28 opacity-10 pointer-events-none">
            <img src="/logo-bachkhoa.png" alt="BK Watermark" className="w-full h-full object-contain filter brightness-200" />
          </div>

          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400">
              MITSUBISHI XPANDER 2020
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Đã liên kết xe
              </span>
              <button
                onClick={() => bleService.disconnect()}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 hover:bg-rose-500/30 flex items-center gap-1 transition active:scale-95"
                title="Ngắt kết nối"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {/* Large Black Car Image */}
          <div className="w-full h-36 flex items-center justify-center my-2">
            <img 
              src="/car-xpander.png" 
              alt="Mitsubishi Xpander 2020" 
              className="max-h-full max-w-full object-contain filter drop-shadow-xl hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* VIN Display Area */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                VEHICLE IDENTIFICATION NUMBER (VIN)
              </span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                Đã đọc từ ECU
              </span>
            </div>

            {/* ĐÃ ĐỌC XONG TỪ ECU: HIỆN SỐ VIN 17 KÝ TỰ */}
            <div className="flex items-center justify-between mt-1.5 animate-in fade-in duration-300">
              <span className="font-mono text-xl sm:text-2xl font-black tracking-wider text-emerald-400">
                {info?.vin || 'MK2NC1W09LP128945'}
              </span>
              <button
                onClick={copyVin}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition active:scale-95"
                title="Sao chép số VIN"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
            <span>Chuẩn: ISO 3779 (17 Ký tự)</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              Xác thực từ ECU (Năm: {info?.modelYear || '2020'})
            </span>
          </div>
        </div>
      ) : isConnected ? (
        /* TRƯỜNG HỢP 2: ĐÃ KẾT NỐI VỚI ESP32 NHƯNG CHƯA LIÊN KẾT XE -> ẨN XE, HIỆN KHUNG CHỜ ĐỌC VIN */
        <div className="bg-white rounded-3xl p-6 border border-blue-200/80 shadow-xs text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 mx-auto flex items-center justify-center text-blue-600 shadow-xs relative">
            <Cpu className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 mb-2">
              <Bluetooth className="w-3.5 h-3.5" />
              <span>Đã kết nối: {bleService.getConnectedDevice()?.name || 'ESP32-OBD2'}</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa phát hiện xe</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Thiết bị ESP32 đã kết nối Bluetooth. Hãy cắm ESP32 vào cổng OBD-II của xe, bật chìa khóa xe sang nấc <strong>ON</strong> và bấm nút bên dưới để đọc số VIN.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReadVin}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang gửi lệnh đọc ECU...' : 'BẮT ĐẦU ĐỌC SỐ VIN TỪ XE'}</span>
            </button>
            <button
              onClick={() => bleService.disconnect()}
              className="px-3.5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1 shrink-0 shadow-2xs"
              title="Ngắt kết nối"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* TRƯỜNG HỢP 3: CHƯA KẾT NỐI BLUETOOTH */
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 mx-auto flex flex-col items-center justify-center text-slate-400">
            <Car className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Chưa kết nối
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa kết nối thiết bị</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Vui lòng kết nối với thiết bị ESP32 qua Bluetooth để bắt đầu nhận diện xe.
            </p>
          </div>
          <button
            onClick={onConnectPrompt}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition"
          >
            Connect a Tool
          </button>
        </div>
      )}

      {/* Chi tiết thông số xe */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <img src="/logo-bachkhoa.png" alt="BK" className="w-4 h-4 object-contain" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isVehicleLinked ? 'THÔNG SỐ GIẢI MÃ TỪ ECU' : isConnected ? 'THÔNG SỐ XE (CHỜ ĐỒNG BỘ)' : 'THÔNG TIN XE (CHƯA LIÊN KẾT)'}
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isVehicleLinked ? 'bg-emerald-50 text-emerald-700' : isConnected ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {isVehicleLinked ? 'Đã xác minh ECU' : isConnected ? 'Đã kết nối ESP32' : 'Chưa kết nối'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Dòng xe</span>
              <span className="text-xs font-bold text-slate-800">
                {isVehicleLinked ? (info?.model || 'Mitsubishi Xpander') : 'Chờ liên kết với xe...'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Động cơ</span>
              <span className="text-xs font-bold text-slate-800">
                {isVehicleLinked ? (info?.engine || '4A91 1.5L MIVEC') : 'Chờ liên kết với xe...'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Năm sản xuất</span>
              <span className="text-xs font-bold text-slate-800">
                {isVehicleLinked ? (info?.modelYear || '2020') : 'Chờ liên kết với xe...'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Xuất xứ</span>
              <span className="text-xs font-bold text-slate-800">
                {isVehicleLinked ? (info?.country || 'Indonesia / Việt Nam') : 'Chờ liên kết với xe...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
