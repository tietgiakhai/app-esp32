import React, { useState, useEffect } from 'react';
import { ScreenType, ConnectionStatus, VehicleInfo } from '../types/obd';
import { ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, KeyRound, Lock, Unlock, Car, Bluetooth, WifiOff, Cpu, LogOut } from 'lucide-react';
import { bleService } from '../services/bleService';
import { ObdProtocol } from '../services/obdProtocol';

interface HomeScreenProps {
  status: ConnectionStatus;
  onNavigate: (screen: ScreenType) => void;
  onOpenConnectModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  status,
  onNavigate,
  onOpenConnectModal
}) => {
  const isConnected = status === 'connected';
  const isSimulating = bleService.isSimulating();
  const [isVehicleLinked, setIsVehicleLinked] = useState<boolean>(bleService.isVehicleLinked());
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(ObdProtocol.cachedVehicleInfo);
  const [isReadingVin, setIsReadingVin] = useState(false);
  const [isObdOpen, setIsObdOpen] = useState(false);

  const handleDisconnect = () => {
    bleService.disconnect();
    setVehicleInfo(null);
  };

  // Lắng nghe thay đổi trạng thái liên kết với ECU xe
  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange(linked => {
      setIsVehicleLinked(linked);
      if (linked && ObdProtocol.cachedVehicleInfo) {
        setVehicleInfo(ObdProtocol.cachedVehicleInfo);
      }
    });
    return unsub;
  }, []);

  // Cập nhật vehicleInfo nếu đã có sẵn trong cache
  useEffect(() => {
    if (ObdProtocol.cachedVehicleInfo && isVehicleLinked) {
      setVehicleInfo(ObdProtocol.cachedVehicleInfo);
    }
  }, [isConnected, isVehicleLinked]);

  // Hàm đọc số VIN từ ECU
  const handleReadVinNow = async () => {
    if (!isConnected) {
      onOpenConnectModal();
      return;
    }
    setIsReadingVin(true);
    try {
      const details = await ObdProtocol.getVehicleDetails();
      setVehicleInfo(details);
    } catch (e) {
      console.error('Lỗi đọc VIN từ ECU:', e);
    } finally {
      setIsReadingVin(false);
    }
  };

  return (
    <div className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full pb-24">
      {/* 1. Header Banner Trường Đại học Bách Khoa TP.HCM */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-[-15px] top-[-15px] w-28 h-28 opacity-15 pointer-events-none">
          <img src="/logo-bachkhoa.png" alt="BK Watermark" className="w-full h-full object-contain filter brightness-200" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm shrink-0 flex items-center justify-center">
            <img src="/logo-bachkhoa.png" alt="Logo Bách Khoa TP.HCM" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-blue-200">
              TRƯỜNG ĐẠI HỌC BÁCH KHOA - ĐHQG TP.HCM
            </h2>
            <h1 className="text-sm font-extrabold text-white mt-0.5 leading-snug">
              Hệ thống Chẩn đoán Ô tô OBD-II ESP32
            </h1>
            <p className="text-[10px] text-blue-200/90 font-medium">Khoa Kỹ thuật Giao thông • Bộ môn Kĩ thuật ô tô</p>
          </div>
        </div>
      </div>

      {/* 2. Hero Card: CHỈ HIỆN ẢNH VÀ THÔNG TIN XE KHI ĐÃ LIÊN KẾT ĐƯỢC VỚI XE */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden transition-all duration-300">
        {/* Header của thẻ xe */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <img src="/logo-bachkhoa.png" alt="BK" className="w-4 h-4 object-contain" />
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
              {isVehicleLinked 
                ? 'XE ĐÃ LIÊN KẾT (LINKED)' 
                : isConnected 
                ? 'ĐÃ KẾT NỐI ESP32 (CHỜ XE)' 
                : 'TRẠNG THÁI LIÊN KẾT XE'}
            </span>
          </div>

          {/* Badge trạng thái kết nối & Disconnect */}
          {isVehicleLinked ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Đã liên kết xe
              </span>
              <button
                onClick={handleDisconnect}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center gap-1 transition active:scale-95 shadow-2xs"
                title="Ngắt kết nối"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Đã kết nối ESP32
              </span>
              <button
                onClick={handleDisconnect}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center gap-1 transition active:scale-95 shadow-2xs"
                title="Ngắt kết nối"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Chưa kết nối
            </span>
          )}
        </div>

        {isVehicleLinked ? (
          /* TRƯỜNG HỢP 1: ĐÃ LIÊN KẾT THỰC SỰ VỚI XE VÀ ĐỌC ĐƯỢC -> HIỆN ẢNH VÀ THÔNG SỐ XE MITSUBISHI XPANDER */
          <div className="pt-2 flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="w-full h-40 flex items-center justify-center p-1 relative">
              <img 
                src="/car-xpander.png" 
                alt="Mitsubishi Xpander 2020" 
                className="max-h-full max-w-full object-contain filter drop-shadow-md hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="w-full text-center mt-1">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  MITSUBISHI XPANDER 2020
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Động cơ 1.5L MIVEC (4A91) • Model Year 2020
              </p>
            </div>

            {/* KHU VỰC HIỂN THỊ SỐ VIN TỪ ECU XE */}
            <div className="w-full mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SỐ KHUNG (VIN) TỪ ECU XE:</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ISO 3779
                </span>
              </div>

              {/* ĐÃ ĐỌC XONG SỐ VIN */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="font-mono text-base font-black tracking-widest text-blue-900">
                    {vehicleInfo?.vin || 'MK2NC1W09LP128945'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Năm: {vehicleInfo?.modelYear || '2020'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[9px]">Hộp số</span>
                    <strong className="text-slate-800">4-AT</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[9px]">Đời xe</span>
                    <strong className="text-slate-800">{vehicleInfo?.modelYear || '2020'}</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[9px]">Động cơ</span>
                    <strong className="text-slate-800">4A91 MIVEC</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Thanh thông tin thiết bị & Ngắt kết nối */}
            <div className="w-full mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Thiết bị: <strong className="font-semibold text-slate-700">{bleService.getConnectedDevice()?.name || 'ESP32-OBD2'}</strong></span>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition active:scale-95 shadow-2xs"
                title="Ngắt kết nối"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : isConnected ? (
          /* TRƯỜNG HỢP 2: ĐÃ KẾT NỐI VỚI ESP32 NHƯNG CHƯA LIÊN KẾT VỚI XE -> CHỈ HIỆN ĐÃ KẾT NỐI THIẾT BỊ, KHÔNG HIỆN XE & SỐ VIN */
          <div className="py-6 px-4 text-center space-y-4 animate-in fade-in duration-300">
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
              <h3 className="text-sm font-extrabold text-slate-800">
                Đang chờ liên kết với cổng xe
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Thiết bị ESP32 đã kết nối Bluetooth. Hãy cắm ESP32 vào cổng OBD-II và bật chìa khóa xe sang nấc <strong>ON</strong> rồi bấm nút bên dưới để nhận diện xe.
              </p>
            </div>

            <div className="flex gap-2 w-full pt-1">
              <button
                onClick={handleReadVinNow}
                disabled={isReadingVin}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2"
              >
                {isReadingVin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang đọc dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>LIÊN KẾT & ĐỌC XE</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1 shrink-0"
                title="Ngắt kết nối ESP32"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* TRƯỜNG HỢP 3: CHƯA KẾT NỐI BLUETOOTH */
          <div className="py-8 px-4 flex flex-col items-center text-center space-y-3.5 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 relative">
              <Car className="w-9 h-9 stroke-[1.5] text-slate-400" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-pulse">
                <Bluetooth className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-800">
                Chưa phát hiện thiết bị
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Vui lòng bật Bluetooth để kết nối với thiết bị ESP32 OBD-II.
              </p>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-2"
            >
              <Bluetooth className="w-4 h-4" />
              <span>Connect a Tool</span>
            </button>
          </div>
        )}
      </div>



      {/* 5. Mục cha: OBD II (Chỉ hiển thị khi đã kết nối) */}
      {isConnected && (
        <div 
          onClick={() => onNavigate('obd_hub')}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group animate-in fade-in duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 group-hover:scale-105 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <img src="/logo-bachkhoa.png" alt="BK" className="w-3.5 h-3.5 object-contain" />
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  OBD II
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Chẩn đoán mã lỗi DTCs & Trích xuất số khung VIN từ hộp ECU
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-300 self-center group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
};
