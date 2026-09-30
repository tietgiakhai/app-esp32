import React, { useState, useEffect } from 'react';
import { Bluetooth, RefreshCw, X, CheckCircle2, AlertCircle, Cpu, Radio, ShieldAlert, Filter, Smartphone, ExternalLink, Copy, Check, LogOut } from 'lucide-react';
import { ConnectionStatus, BleDevice } from '../types/obd';
import { Capacitor } from '@capacitor/core';
import { bleService, NUS_SERVICE_UUID, isIosDevice, isWebBleSupported } from '../services/bleService';

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
  const DEFAULT_DEVICES: BleDevice[] = [
    { id: '1', name: 'ESP32-OBD2 (Cổng xe Xpander)', rssi: -52 },
    { id: '2', name: 'OBDII-BLE-BK (Lab Ô tô Bách Khoa)', rssi: -66 },
    { id: '3', name: 'ESP32_CAN_DIAGNOSTIC', rssi: -74 }
  ];

  const isIos = isIosDevice();
  const hasWebBle = isWebBleSupported();
  const [copiedLink, setCopiedLink] = useState(false);
  const [iosAlertMessage, setIosAlertMessage] = useState<string | null>(null);
  const isVehicleLinked = bleService.isVehicleLinked();

  const [devices, setDevices] = useState<BleDevice[]>(DEFAULT_DEVICES);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState<string>('Đã tìm thấy thiết bị phát sóng');
  const [filterOnlyNamed, setFilterOnlyNamed] = useState<boolean>(true);

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

  // Lọc thiết bị: nếu bật 'filterOnlyNamed', ẩn những thiết bị rác không có tên hoặc Unknown
  const displayedDevices = devices.filter(d => {
    if (!filterOnlyNamed) return true;
    const name = d.name ? d.name.trim() : '';
    return name !== '' && !name.toLowerCase().includes('unknown') && !name.toLowerCase().includes('unsupported');
  });

  // Hàm quét mô phỏng hiệu ứng dò tìm sóng thực tế
  const runScanDiscovery = () => {
    setIsScanning(true);
    setDevices([]);
    setScanStatusText('Đang phát sóng và quét các thiết bị Bluetooth xung quanh...');

    setTimeout(() => {
      setDevices([DEFAULT_DEVICES[0]]);
      setSelectedId(DEFAULT_DEVICES[0].id);
      setScanStatusText(`✓ Tìm thấy: ${DEFAULT_DEVICES[0].name}`);
    }, 400);

    setTimeout(() => {
      setDevices([DEFAULT_DEVICES[0], DEFAULT_DEVICES[1]]);
      setScanStatusText(`✓ Tìm thấy: ${DEFAULT_DEVICES[1].name}`);
    }, 800);

    setTimeout(() => {
      setDevices(DEFAULT_DEVICES);
      setScanStatusText(`✓ Đã quét xong: Tìm thấy ${DEFAULT_DEVICES.length} thiết bị đang bật Bluetooth`);
      setIsScanning(false);
    }, 1200);
  };

  // Tự động quét khi mở modal nếu chưa kết nối
  useEffect(() => {
    if (isOpen && status !== 'connected') {
      runScanDiscovery();
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === 'connected') {
      onConnected();
    }
  }, [status]);

  if (!isOpen) return null;

  // 1. Kết nối với thiết bị đã chọn trong danh sách quét được
  const handleConnectSelected = async () => {
    const selectedDev = devices.find(d => d.id === selectedId) || devices[0];
    await bleService.connectDevice(selectedDev);
  };

  // 2. Mở bộ dò tìm Bluetooth thực tế trên điện thoại (Web Bluetooth)
  const handleNativeScan = async (onlyNamed: boolean = true) => {
    if (isIos && !hasWebBle) {
      setIosAlertMessage('Safari trên iPhone chặn Bluetooth từ Web. Hãy bấm sao chép link bên dưới và mở bằng app Bluefy (Web BLE Browser) trên App Store để kết nối ESP32!');
      return;
    }
    setIosAlertMessage(null);
    setIsScanning(true);
    setScanStatusText(onlyNamed ? 'Đang lọc tìm thiết bị ESP32/OBD-II có tên...' : 'Đang quét toàn bộ thiết bị Bluetooth...');
    try {
      const dev = await bleService.connectRealDevice(onlyNamed);
      if (dev) {
        setDevices(prev => [dev, ...prev.filter(d => d.id !== dev.id)]);
        setSelectedId(dev.id);
        setScanStatusText(`✓ Đã kết nối với: ${dev.name}`);
      }
    } catch (err: any) {
      console.warn('Native scan error or cancelled:', err);
      runScanDiscovery();
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectSimulator = async () => {
    await bleService.connectSimulator();
    onClose();
  };

  const handleDisconnect = () => {
    bleService.disconnect();
  };

  const selectedDevice = devices.find(d => d.id === selectedId) || devices[0] || DEFAULT_DEVICES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header với Logo Bách Khoa */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-sm">ĐH Bách Khoa TP.HCM</h3>
              <p className="text-[11px] text-slate-500">Quét Bluetooth BLE • Thiết bị OBD-II</p>
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
        <div className="p-4 space-y-3 max-h-[85vh] overflow-y-auto">
          {/* Thông báo riêng cho iOS nếu người dùng bấm scan trên Safari */}
          {iosAlertMessage && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px]">
                <p className="font-medium">{iosAlertMessage}</p>
                <div className="flex gap-2 mt-2">
                  <a
                    href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-800 underline flex items-center gap-0.5"
                  >
                    <span>Mở App Store tải Bluefy</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="font-bold text-blue-700 underline"
                  >
                    {copiedLink ? '✓ Đã sao chép link' : 'Sao chép link'}
                  </button>
                </div>
              </div>
              <button onClick={() => setIosAlertMessage(null)} className="text-amber-500 hover:text-amber-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* HƯỚNG DẪN DÀNH RIÊNG CHO IPHONE / IPAD (iOS) */}
          {isIos && !hasWebBle && (
            <div className="p-3 bg-gradient-to-r from-amber-50/90 to-orange-50/90 rounded-2xl border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>Kết nối Bluetooth trên iPhone (iOS)</span>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                  Cần app Bluefy
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-tight">
                Apple khóa Bluetooth trên Safari. Để điện thoại iPhone kết nối trực tiếp với <strong>ESP32 thật</strong>:
              </p>
              <div className="flex gap-1.5 pt-1">
                <a
                  href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-1 shadow-2xs active:scale-[0.98] transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Tải Bluefy (App Store)</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-1.5 px-2 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Đã chép link!' : 'Chép link Web'}</span>
                </button>
              </div>
            </div>
          )}

          {isIos && hasWebBle && (
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {Capacitor.isNativePlatform()
                  ? '✓ Ứng dụng iOS Native - Sẵn sàng kết nối Bluetooth trực tiếp với ESP32!'
                  : '✓ Đang chạy trên Bluefy (iOS) - Sẵn sàng kết nối Bluetooth với ESP32!'}
              </span>
            </div>
          )}

          {/* Header trạng thái xe - CHỈ HIỆN ẢNH XE KHI ĐÃ LIÊN KẾT ĐƯỢC VỚI XE */}
          {status === 'connected' ? (
            isVehicleLinked ? (
              <div className="p-2.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center gap-3 animate-in fade-in duration-300">
                <img src="/car-xpander.png" alt="Xpander" className="w-14 h-8 object-contain shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Đã nhận diện xe:
                  </span>
                  <strong className="text-xs font-bold text-slate-900 block">
                    Mitsubishi Xpander 2020
                  </strong>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center gap-3 animate-in fade-in duration-300">
                <div className="w-10 h-8 bg-white rounded-lg border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider block">
                    Thiết bị ESP32:
                  </span>
                  <strong className="text-xs font-bold text-slate-900 block">
                    Đã kết nối Bluetooth ({bleService.getConnectedDevice()?.name || 'ESP32-OBD2'})
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Trạng thái xe: Chờ cắm cổng OBD-II & bật khóa ON
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-8 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                <Bluetooth className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  Trạng thái liên kết:
                </span>
                <strong className="text-xs font-bold text-slate-800 block">
                  Chờ ghép nối thiết bị ESP32
                </strong>
              </div>
            </div>
          )}

          {status === 'connected' ? (
            /* TRẠNG THÁI ĐÃ KẾT NỐI */
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-sm">
                  {isVehicleLinked ? 'Đã liên kết xe thành công!' : 'Đã kết nối thiết bị ESP32!'}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Thiết bị: <strong className="font-bold">{bleService.getConnectedDevice()?.name || 'ESP32-OBD2'}</strong>
                </p>
                {!isVehicleLinked && (
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    (Chưa phát hiện tín hiệu ECU xe. Hãy cắm cổng OBD-II và bật chìa khóa ON để đọc thông tin xe)
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                >
                  Bắt đầu chẩn đoán
                </button>
                <button
                  onClick={handleDisconnect}
                  className="py-2.5 px-3 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                  title="Ngắt kết nối"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* TRẠNG THÁI QUÉT VÀ HIỂN THỊ CÁC THIẾT BỊ BẬT BLUETOOTH */
            <div className="space-y-3">
              {/* Thanh trạng thái quét trực tiếp */}
              <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
                  <span className="font-medium text-blue-950 text-[11px] truncate max-w-[220px]">
                    {scanStatusText}
                  </span>
                </div>
                <button 
                  onClick={runScanDiscovery}
                  disabled={isScanning}
                  className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold text-[11px] shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Quét lại</span>
                </button>
              </div>

              {/* Tùy chọn lọc thiết bị không tên */}
              <div className="flex items-center justify-between px-1 py-1 text-xs">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  Chế độ lọc thiết bị:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterOnlyNamed(!filterOnlyNamed)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition ${
                    filterOnlyNamed
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {filterOnlyNamed ? '✓ Chỉ hiện có tên' : 'Hiện tất cả'}
                </button>
              </div>

              {/* Danh sách thiết bị quét được */}
              <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                {displayedDevices.length === 0 ? (
                  <div className="py-7 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    <p className="text-xs font-medium">Đang tìm kiếm thiết bị bật Bluetooth...</p>
                  </div>
                ) : (
                  displayedDevices.map(dev => {
                    const isChosen = selectedId === dev.id;
                    return (
                      <div
                        key={dev.id}
                        onClick={() => setSelectedId(dev.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isChosen
                            ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                            : 'border-slate-200/90 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isChosen ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Bluetooth className="w-5 h-5" />
                            </div>
                            <div>
                              {/* TÊN THIẾT BỊ QUÉT ĐƯỢC */}
                              <p className="text-xs font-extrabold text-slate-900">
                                {dev.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Đang phát sóng Bluetooth
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-mono font-bold text-slate-500 block">
                              {dev.rssi} dBm
                            </span>
                            <span className="text-[9px] font-semibold text-emerald-600 block">
                              Sóng tốt
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Khu vực hành động kết nối */}
              <div className="space-y-2 pt-1">
                {/* NÚT CHÍNH: QUÉT VÀ GHÉP ĐÔI BLUETOOTH THỰC TẾ (WEB BLE / BLUEFY) */}
                <button
                  onClick={() => handleNativeScan(true)}
                  disabled={isScanning || status === 'connecting'}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Bluetooth className={`w-4 h-4 ${isScanning ? 'animate-bounce' : ''}`} />
                  <span>
                    {isScanning 
                      ? 'Đang mở cửa sổ quét Bluetooth...' 
                      : (status === 'connecting' ? 'Đang kết nối ESP32...' : 'QUÉT VÀ GHÉP ĐÔI ESP32 (BLUETOOTH THẬT)')}
                  </span>
                </button>

                {/* Các nút phụ trợ */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleNativeScan(false)}
                    disabled={isScanning}
                    className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1"
                    title="Quét toàn bộ mọi thiết bị xung quanh"
                  >
                    <Radio className="w-3.5 h-3.5 text-slate-500" />
                    <span>Quét toàn bộ</span>
                  </button>

                  <button
                    onClick={handleConnectSelected}
                    className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1"
                    title="Chọn thiết bị từ danh sách mẫu"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nối theo mẫu</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="shrink-0 mx-2 text-[9px] text-slate-400 font-bold uppercase">HOẶC CHẠY THỬ MÔ PHỎNG</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Nút 3: Giả lập nhanh */}
                <button
                  onClick={handleConnectSimulator}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chạy giả lập ESP32 Virtual (Test không cần xe)</span>
                </button>
              </div>
            </div>
          )}

          {/* MẸO KHẮC PHỤC KHI KHÔNG LINK ĐƯỢC */}
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-[10px] text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Nếu thấy tên ESP32 nhưng bấm vào không link được:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li><strong>Chưa cấp quyền:</strong> Kiểm tra xem đã cấp quyền Bluetooth cho app <em>Bluefy</em> chưa (Cài đặt iPhone ➔ Bluefy ➔ Bật Bluetooth).</li>
              <li><strong>Đã ghép đôi ở ngoài:</strong> Nếu đã lỡ ghép đôi trong <em>Cài đặt Bluetooth</em> của điện thoại, hãy bấm <strong>"Quên thiết bị này"</strong> (Forget Device) để app tự kết nối.</li>
              <li><strong>Đang nối máy khác:</strong> Rút nguồn cắm lại ESP32 để đảm bảo không bị thiết bị khác chiếm giữ sóng.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
