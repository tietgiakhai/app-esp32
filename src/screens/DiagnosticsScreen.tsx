import React, { useState, useEffect } from 'react';
import { ConnectionStatus, DTC } from '../types/obd';
import { ObdProtocol } from '../services/obdProtocol';
import { bleService } from '../services/bleService';
import { Trash2, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert, AlertCircle, Lock, Car } from 'lucide-react';

interface DiagnosticsScreenProps {
  status: ConnectionStatus;
  onConnectPrompt: () => void;
}

export const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({
  status,
  onConnectPrompt
}) => {
  const [dtcs, setDtcs] = useState<DTC[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [eraseSuccess, setEraseSuccess] = useState(false);
  const [isVehicleLinked, setIsVehicleLinked] = useState(bleService.isVehicleLinked());
  const [isPinging, setIsPinging] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange((linked) => {
      setIsVehicleLinked(linked);
    });
    return () => unsub();
  }, []);

  const isConnected = status === 'connected';

  const handlePingVehicle = async () => {
    setIsPinging(true);
    setPingError(null);
    try {
      const ok = await ObdProtocol.pingVehicleECU();
      if (!ok) {
        setPingError('Chưa nhận được phản hồi từ ECU. Hãy chắc chắn chìa khóa xe đã bật ON và ESP32 cắm chắc vào cổng OBD-II.');
      }
    } catch {
      setPingError('Lỗi kết nối mạng CAN tới ECU xe.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleScanDTCs = async () => {
    if (!isConnected) {
      onConnectPrompt();
      return;
    }
    // Bất khả thi quét lỗi khi chưa liên kết được với xe!
    if (!isVehicleLinked) {
      return;
    }
    setLoading(true);
    setEraseSuccess(false);
    try {
      const results = await ObdProtocol.readDTCs();
      setDtcs(results);
      setHasScanned(true);
      setLastScanned(new Date().toLocaleTimeString());
      if (results.length > 0) {
        setExpandedCode(results[0].code);
      }
    } catch (e) {
      console.error('Lỗi scan DTCs:', e);
      setHasScanned(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmErase = async () => {
    setShowConfirmModal(false);
    setErasing(true);
    try {
      const success = await ObdProtocol.eraseDTCs();
      if (success) {
        setDtcs([]);
        setEraseSuccess(true);
        setLastScanned(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Lỗi khi xóa DTCs:', e);
    } finally {
      setErasing(false);
    }
  };

  return (
    <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4 pb-28">
      {/* Brand Header: Logo Bách Khoa + Xe Mitsubishi Xpander */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-900 block leading-tight">
                ĐH BÁCH KHOA TP.HCM
              </span>
              <span className="text-[9px] text-slate-500">Bộ môn Kĩ thuật ô tô • Chẩn đoán DTC</span>
            </div>
          </div>

          {isVehicleLinked ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 animate-in fade-in duration-300">
              <img src="/car-xpander.png" alt="Xpander" className="w-8 h-5 object-contain" />
              <span className="text-[10px] font-bold text-emerald-800">Xpander 2020</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 text-blue-700 animate-in fade-in duration-200">
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

        <div className="flex items-center justify-between mt-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">OBD-II Diagnostics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lastScanned ? `Lần quét cuối: ${lastScanned}` : (isConnected ? 'Quét mã lỗi hệ thống ECU Mitsubishi Xpander 2020' : 'Quét mã lỗi hệ thống ECU qua chuẩn OBD-II')}
            </p>
          </div>

          <button
            onClick={handleScanDTCs}
            disabled={!isVehicleLinked || loading}
            title={!isVehicleLinked ? 'Bất khả thi khi chưa kết nối với xe' : 'Quét mã lỗi ECU'}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              !isVehicleLinked
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95'
            }`}
          >
            {!isVehicleLinked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            )}
            <span>{loading ? 'Đang quét...' : !isVehicleLinked ? 'Chưa nối xe' : 'Quét DTCs'}</span>
          </button>
        </div>

        {/* MIL Status indicator */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              !hasScanned ? 'bg-slate-300' : dtcs.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`} />
            <span className="text-xs font-medium text-slate-700">
              Đèn báo lỗi động cơ (MIL):
            </span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            !hasScanned 
              ? 'bg-slate-100 text-slate-600'
              : dtcs.length > 0 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-emerald-100 text-emerald-800'
          }`}>
            {!hasScanned ? 'Chưa quét dữ liệu' : dtcs.length > 0 ? 'MIL BẬT (Phát hiện lỗi)' : 'MIL TẮT (Bình thường)'}
          </span>
        </div>
      </div>

      {/* Erase Success Notification */}
      {eraseSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 animate-in fade-in duration-300">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Mã lỗi đã được xóa thành công!</p>
            <p className="text-emerald-700 mt-0.5">{isConnected ? 'ECU xe Mitsubishi Xpander đã tắt đèn Check Engine và đặt lại bộ giám sát.' : 'ECU xe đã tắt đèn Check Engine và đặt lại bộ giám sát.'}</p>
          </div>
        </div>
      )}

      {/* DTCs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>DANH SÁCH MÃ LỖI ({hasScanned ? dtcs.length : 'Chưa quét'})</span>
          {hasScanned && dtcs.length > 0 && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa mã lỗi</span>
            </button>
          )}
        </div>

        {!hasScanned ? (
          !isConnected ? (
            /* TRƯỜNG HỢP 1: CHƯA KẾT NỐI ESP32 */
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-4 shadow-2xs animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-slate-400 mx-auto flex items-center justify-center">
                <Car className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-2 inline-block">
                  Chưa kết nối thiết bị
                </span>
                <h4 className="font-bold text-slate-800 text-base">Quét mã lỗi là bất khả thi</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Ứng dụng chưa kết nối với thiết bị ESP32 OBD-II. Việc bắt đầu quét mã lỗi là <strong>bất khả thi</strong>. Vui lòng bật Bluetooth và kết nối thiết bị trước.
                </p>
              </div>
              <button
                onClick={onConnectPrompt}
                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition mx-auto"
              >
                Connect a Tool
              </button>
            </div>
          ) : !isVehicleLinked ? (
            /* TRƯỜNG HỢP 2: ĐÃ NỐI ESP32 NHƯNG CHƯA NỐI XE -> BẤT KHẢ THI QUÉT MÃ LỖI */
            <div className="bg-white rounded-2xl p-6 border border-amber-200/90 shadow-xs text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200 relative">
                <ShieldAlert className="w-8 h-8" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white">
                  !
                </span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>ESP32 đã nối • Chưa liên kết ECU xe</span>
                </div>
                <h4 className="font-bold text-slate-800 text-base">Bắt đầu quét mã là bất khả thi</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1 leading-relaxed">
                  Thiết bị ESP32 đã kết nối Bluetooth nhưng <strong>chưa bắt được tín hiệu mạng CAN từ hộp ECU xe</strong>. Không thể quét mã lỗi khi chưa giao tiếp thành công với xe.
                </p>

                <div className="mt-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-left text-xs space-y-1 text-slate-700">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Để có thể bắt đầu quét lỗi, bạn cần:</span>
                  </p>
                  <p className="pl-5 text-[11px]">1. Cắm chắc chắn ESP32 vào cổng OBD-II 16 chân trên xe.</p>
                  <p className="pl-5 text-[11px]">2. Bật chìa khóa xe sang nấc <strong>ON (Ignition ON)</strong> để cấp điện cho hộp ECU.</p>
                  <p className="pl-5 text-[11px]">3. Bấm nút kiểm tra tín hiệu bên dưới để kết nối với xe.</p>
                </div>

                {pingError && (
                  <div className="mt-2.5 p-2.5 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-700 font-medium animate-in fade-in">
                    ⚠ {pingError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={handlePingVehicle}
                  disabled={isPinging}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Đang gửi tín hiệu CAN tới ECU...' : 'KIỂM TRA LIÊN KẾT XE (ECU CAN BUS)'}</span>
                </button>

                <button
                  disabled
                  className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1.5"
                  title="Bất khả thi khi chưa kết nối với xe"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>BẮT ĐẦU QUÉT MÃ LỖI (BẤT KHẢ THI - ĐANG KHÓA)</span>
                </button>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP 3: ĐÃ LIÊN KẾT XE -> SẴN SÀNG QUÉT */
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-4 shadow-2xs animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Xe đã liên kết • ECU sẵn sàng</span>
                </div>
                <h4 className="font-bold text-slate-800 text-base">Xe đã sẵn sàng chẩn đoán</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Hộp điều khiển động cơ ECU xe đã phản hồi giao thức CAN bus. Nhấn nút bên dưới để bắt đầu quét lỗi.
                </p>
              </div>
              <button
                onClick={handleScanDTCs}
                disabled={loading}
                className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Đang đọc ECU xe...' : 'BẮT ĐẦU QUÉT MÃ LỖI'}</span>
              </button>
            </div>
          )
        ) : dtcs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-3 shadow-2xs animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Không phát hiện mã lỗi nào</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                {isConnected 
                  ? 'ECU xe Mitsubishi Xpander hoạt động bình thường. Tất cả hệ thống truyền động không ghi nhận mã lỗi.'
                  : 'Vui lòng kết nối thiết bị quét ESP32 để đọc mã lỗi trên xe.'}
              </p>
            </div>
          </div>
        ) : (
          dtcs.map((dtc) => {
            const isExpanded = expandedCode === dtc.code;
            return (
              <div
                key={dtc.code}
                className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all"
              >
                <div
                  onClick={() => setExpandedCode(isExpanded ? null : dtc.code)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      dtc.severity === 'Critical'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {dtc.code.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 font-mono text-base">{dtc.code}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {dtc.status}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          dtc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {dtc.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">
                        {dtc.descriptionVi}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Định nghĩa tiếng Anh (OBD Standard)
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {dtc.descriptionEn}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {isConnected ? 'Triệu chứng trên xe Mitsubishi Xpander' : 'Triệu chứng nhận biết trên xe'}
                      </span>
                      <ul className="mt-1 space-y-1">
                        {dtc.symptoms.map((sym, idx) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{sym}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nguyên nhân hư hỏng tiềm ẩn
                      </span>
                      <ul className="mt-1 space-y-1">
                        {dtc.possibleCauses.map((cau, idx) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{cau}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isConnected ? 'Xóa mã lỗi xe Mitsubishi Xpander?' : 'Xóa mã lỗi hệ thống ECU?'}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Hành động này sẽ gửi lệnh <strong>Mode 04</strong> đến ECU để xóa mã lỗi đã lưu và tắt đèn Check Engine trên bảng táp-lô xe.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2 text-left text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Khuyến cáo: Chỉ xóa lỗi sau khi đã kiểm tra và khắc phục nguyên nhân cơ khí/điện.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmErase}
                disabled={erasing}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-500/20 transition disabled:opacity-50"
              >
                {erasing ? 'Đang xóa...' : 'Xác nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
