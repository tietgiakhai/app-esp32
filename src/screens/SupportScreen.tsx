import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { bleService } from '../services/bleService';

export const SupportScreen: React.FC = () => {
  const [isVehicleLinked, setIsVehicleLinked] = useState(bleService.isVehicleLinked());
  const isConnected = bleService.getStatus() === 'connected';

  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange((linked) => {
      setIsVehicleLinked(linked);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4 pb-28">
      {/* Brand Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-900 block leading-tight">
                ĐH BÁCH KHOA TP.HCM
              </span>
              <span className="text-[9px] text-slate-500">Hướng dẫn kỹ thuật & Cổng OBD-II</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
            <span className="text-[10px] font-bold text-blue-800">Cổng OBD-II 16 Pin</span>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="text-lg font-black text-slate-900">
            Cổng OBD-II Trên Xe
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Vị trí chính xác cổng chẩn đoán OBD-II 16 chân trên xe
          </p>
        </div>
      </div>

      {/* Nội dung Vị trí Cổng OBD */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Vị trí thực tế cổng OBD-II 16 chân trên xe</span>
        </h3>

        {/* Hình ảnh vị trí cổng cắm OBD-II thực tế trên xe: LUÔN HIỂN THỊ */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs">
          <div className="relative w-full aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
            <img 
              src="/obd-location.png" 
              alt="Vị trí cổng OBD-II thực tế trên xe" 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>CỔNG OBD-II 16 PIN</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-800">
              Hình ảnh thực tế vị trí cổng OBD-II dưới vô lăng
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Cổng chẩn đoán 16 chân nằm ở hộc dưới táp-lô phía người lái, ngay trên cụm chân phanh
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 text-xs text-blue-900 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>{isConnected ? 'Vị trí giắc cắm trên xe Xpander:' : 'Vị trí giắc cắm chuẩn trên xe:'}</span>
          </p>
          <p className="text-slate-700 leading-relaxed pl-3.5">
            Cổng OBD-II 16 chân nằm ở <strong>góc dưới bên trái của vô lăng</strong> (ngay phía trên cụm bàn đạp ga và phanh). Bạn chỉ cần cúi xuống nhìn vào gầm táp-lô bên tài là thấy ngay.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
          <p className="font-bold text-slate-900">{isConnected ? 'Lưu ý khi chẩn đoán xe Xpander:' : 'Lưu ý khi chẩn đoán xe:'}</p>
          <p>• Bật chìa khóa xe sang nấc <strong>ON (Ignition ON)</strong> để ECU nhận nguồn trước khi bấm quét lỗi.</p>
          <p>• Nếu muốn xem Live Data (vòng tua máy RPM, tốc độ), hãy khởi động động cơ (Engine Running).</p>
        </div>

        {/* Khung tương thích BLE iOS & Android do người dùng yêu cầu giữ */}
        <div className="p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
          <p className="font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>✓ Tương thích 100% với iOS (iPhone/iPad) & Android:</span>
          </p>
          <p className="text-emerald-700 leading-relaxed pl-5">
            Giao thức Bluetooth Low Energy (BLE) chuẩn Nordic UART Service (NUS) do ĐH Bách Khoa lập trình không bị hệ điều hành iOS chặn kết nối như các loại ELM327 Bluetooth 2.0 cũ.
          </p>
        </div>
      </div>
    </div>
  );
};
