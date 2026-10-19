import React, { useState, useEffect } from 'react';
import { Bluetooth, RefreshCw, X, CheckCircle2, AlertCircle, Cpu, Radio, Smartphone, ExternalLink, Copy, Check, LogOut, Sparkles } from 'lucide-react';
import { ConnectionStatus, BleDevice } from '../types/obd';
import { Capacitor } from '@capacitor/core';
import { bleService, isIosDevice, isWebBleSupported } from '../services/bleService';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus;
  onConnected: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onClose,
  status,
  onConnected
}) => {
  const isIos = isIosDevice();
  const hasWebBle = isWebBleSupported();
  const [copiedLink, setCopiedLink] = useState(false);
  const [iosAlertMessage, setIosAlertMessage] = useState<string | null>(null);
  const isVehicleLinked = bleService.isVehicleLinked();
  const isSimulating = bleService.isSimulating();
  const connectedDev = bleService.getConnectedDevice();

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href);
      } else {
        const input = document.createElement('input');
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (status === 'connected') {
      onConnected();
    }
  }, [status]);

  if (!isOpen) return null;

  // 1. Quét và kết nối Bluetooth THẬT với ESP32
  const handleConnectRealBle = async (onlyNamed: boolean = false) => {
    if (isIos && !hasWebBle && !Capacitor.isNativePlatform()) {
      setIosAlertMessage('Trình duyệt Safari trên iPhone chặn Web Bluetooth. Vui lòng mở ứng dụng bằng app Bluefy (trên App Store) hoặc tải file IPA cài trực tiếp để kết nối Bluetooth!');
      return;
    }
    setIosAlertMessage(null);
    setScanError(null);
    setIsScanning(true);

    try {
      const dev = await bleService.connectRealDevice(onlyNamed);
      if (dev) {
        onConnected();
        onClose();
      }
    } catch (err: any) {
      console.warn('Real scan error:', err);
      setScanError(err.message || 'Không thể kết nối Bluetooth');
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Chế độ Giả lập (Test bàn không cần phần cứng)
  const handleConnectSimulator = async () => {
    setScanError(null);
    await bleService.connectSimulator();
    onClose();
  };

  // 3. Ngắt kết nối
  const handleDisconnect = () => {
    bleService.disconnect();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header với Logo Bách Khoa */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-sm">ĐH Bách Khoa TP.HCM</h3>
              <p className="text-[11px] text-slate-500">Kết nối Bluetooth ESP32 OBD-II</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
          {/* Cảnh báo dành riêng cho Safari trên iPhone */}
          {iosAlertMessage && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2 text-xs text-amber-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px]">
                <p className="font-medium leading-relaxed">{iosAlertMessage}</p>
                <div className="flex gap-2 mt-2">
                  <a
                    href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-800 underline flex items-center gap-0.5"
                  >
                    <span>Mở Bluefy trên App Store</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="font-bold text-blue-700 underline"
                  >
                    {copiedLink ? '✓ Đã chép link' : 'Sao chép link web'}
                  </button>
                </div>
              </div>
              <button onClick={() => setIosAlertMessage(null)} className="text-amber-500 hover:text-amber-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {scanError && (
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* TRẠNG THÁI: ĐÃ KẾT NỐI */}
          {status === 'connected' ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {isSimulating ? 'CHẾ ĐỘ MÔ PHỎNG (VIRTUAL)' : 'ĐÃ KẾT NỐI ESP32 THẬT'}
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {connectedDev?.name || 'ESP32-OBD2'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Trạng thái:</span>
                  <strong className="text-emerald-700">Đang trực tuyến</strong>
                </div>
                <div className="flex justify-between">
                  <span>Liên kết ECU xe:</span>
                  <strong className={isVehicleLinked ? 'text-emerald-700' : 'text-amber-600'}>
                    {isVehicleLinked ? '✓ Đã nhận tín hiệu xe' : 'Chờ bật chìa khóa ON'}
                  </strong>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Bắt đầu chẩn đoán
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
                  title="Ngắt kết nối"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ngắt</span>
                </button>
              </div>
            </div>
          ) : (
            /* TRẠNG THÁI: CHƯA KẾT NỐI */
            <div className="space-y-3">
              {/* Card thông tin hướng dẫn */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Bluetooth className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">
                      Ghép nối với mạch ESP32
                    </h4>
                    <p className="text-[10px] text-blue-700 font-medium">Đọc dữ liệu CAN bus thật từ xe</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-2">
                  Bấm nút bên dưới, điện thoại sẽ mở hộp thoại quét Bluetooth. Bạn hãy chọn đúng tên mạch ESP32 mà bạn đã nạp code trong VS Code để ghép đôi.
                </p>
              </div>

              {/* NÚT CHÍNH: QUÉT VÀ KẾT NỐI ESP32 THẬT */}
              <button
                onClick={() => handleConnectRealBle(false)}
                disabled={isScanning || status === 'connecting'}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang mở bộ dò tìm Bluetooth...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 animate-pulse" />
                    <span>QUÉT & KẾT NỐI ESP32 (BLUETOOTH THẬT)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 pt-1 pb-1">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] uppercase font-bold text-slate-400">HOẶC TEST BÀN</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* NÚT PHỤ: CHẾ ĐỘ GIẢ LẬP (TEST KHÔNG CẦN XE) */}
              <button
                onClick={handleConnectSimulator}
                disabled={isScanning}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Bật chế độ Giả lập (Test không cần phần cứng)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
