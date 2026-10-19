import React, { useState, useEffect } from 'react';
import { ConnectionStatus, SensorData } from '../types/obd';
import { GaugeMeter } from '../components/Gauges/GaugeMeter';
import { ObdProtocol } from '../services/obdProtocol';
import { bleService } from '../services/bleService';
import { XPANDER_LIVE_PIDS, LIVE_CATEGORIES } from '../services/xpanderPids';
import { Play, Square, Search, ChevronDown, ChevronUp, Layers, Gauge, Info, CheckCircle2 } from 'lucide-react';

interface LiveDataScreenProps {
  status: ConnectionStatus;
  onConnectScanTool: () => void;
}

export const LiveDataScreen: React.FC<LiveDataScreenProps> = ({
  status,
  onConnectScanTool
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'past_recordings'>('dashboard');
  const [viewMode, setViewMode] = useState<'gauges' | 'list'>('gauges');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedPid, setExpandedPid] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isVehicleLinked, setIsVehicleLinked] = useState(bleService.isVehicleLinked());
  const isConnected = status === 'connected';
  const isSimulating = bleService.isSimulating();

  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange((linked) => {
      setIsVehicleLinked(linked);
    });
    return () => unsub();
  }, []);

  const [sensor, setSensor] = useState<SensorData>({
    rpm: 850,
    speed: 0,
    engineLoad: 44.7,
    absLoad: 42.4,
    timingAdvance: 11.0,
    runTime: 442,
    coolantTemp: 86,
    intakeTemp: 46,
    mapKpa: 43,
    baroPressure: 99,
    ambientTemp: 45,
    fuelLevel: 68,
    fuelSystemStatus: 'CL',
    stftB1: -0.78,
    ltftB1: 0.0,
    lambdaCmd: 1.000,
    evapPurge: 13.7,
    fuelType: 'Xăng (GAS)',
    throttle: 14.5,
    throttleB: 15.3,
    relThrottle: 7.1,
    cmdThrottle: 7.1,
    pedalD: 18.8,
    pedalE: 9.4,
    pedalRel: 0.0,
    o2s1Volt: 0.10,
    o2s1Trim: -0.78,
    o2s2Volt: 0.82,
    o2s2Trim: -0.78,
    o2Locations: 'B1: S1, S2',
    obdType: 'EOBD',
    voltage: 13.55,
    milOn: false,
    dtcCount: 0,
    warmupsSinceClear: 1,
    distanceSinceClear: 0,
    milDistance: 0,
    timestamp: Date.now()
  });

  const [history, setHistory] = useState<{ time: number; rpm: number; speed: number; coolantTemp: number }[]>([]);

  // Sequential Polling loop - không bao giờ chồng chéo gói tin BLE
  useEffect(() => {
    if (!isConnected) return;

    let isMounted = true;
    let timeoutId: any = null;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const data = await ObdProtocol.queryLiveData();
        if (isMounted) {
          setSensor({ ...data });
          setHistory(prev => {
            const next = [...prev, {
              time: Date.now(),
              rpm: data.rpm,
              speed: data.speed,
              coolantTemp: data.coolantTemp
            }];
            return next.slice(-40);
          });
        }
      } catch (e) {
        console.warn('Live poll error:', e);
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(poll, 70);
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isConnected]);

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      const newRec = {
        id: Date.now().toString(),
        date: new Date().toLocaleTimeString(),
        samples: history.length,
        peakRpm: Math.max(...history.map(h => h.rpm), sensor.rpm),
        topSpeed: Math.max(...history.map(h => h.speed), sensor.speed)
      };
      setRecordings(prev => [newRec, ...prev]);
    } else {
      setIsRecording(true);
    }
  };

  // Lọc danh sách 37 PIDs theo Nhóm và Từ khóa tìm kiếm
  const filteredPids = XPANDER_LIVE_PIDS.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    if (!matchesCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.pid.toLowerCase().includes(q) ||
      item.codeHex.toLowerCase().includes(q) ||
      item.nameVi.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.shortName.toLowerCase().includes(q)
    );
  });

  // Hàm tính tỷ lệ % và màu sắc cho thanh đồng hồ đo
  const getGaugeProgress = (val: string | number, min: number = 0, max: number = 100) => {
    if (typeof val !== 'number') return { percent: 100, isNumeric: false };
    const clamped = Math.min(Math.max(val, min), max);
    const percent = max > min ? Math.round(((clamped - min) / (max - min)) * 100) : 0;
    return { percent, isNumeric: true };
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'engine':
        return {
          bar: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'fuel_air':
        return {
          bar: 'bg-gradient-to-r from-emerald-500 to-teal-600',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'throttle':
        return {
          bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'exhaust':
        return {
          bar: 'bg-gradient-to-r from-violet-500 to-purple-600',
          badge: 'bg-violet-50 text-violet-700 border-violet-200',
          dot: 'bg-violet-500'
        };
      case 'ecu_status':
      default:
        return {
          bar: 'bg-gradient-to-r from-cyan-500 to-blue-600',
          badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          dot: 'bg-cyan-500'
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-3 min-h-[calc(100vh-130px)] pb-24">
      {/* Mini Brand Banner: Logo Bách Khoa + Xe Mitsubishi Xpander */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
            <img src="/logo-bachkhoa.png" alt="BK" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-900 block leading-tight">
              ĐH BÁCH KHOA TP.HCM
            </span>
            <span className="text-[9px] text-slate-500">Live Telemetry • 37 PIDs Xpander</span>
          </div>
        </div>

        {/* Thumbnail xe Xpander */}
        {isVehicleLinked ? (
          <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 animate-in fade-in duration-300">
            <img src="/car-xpander.png" alt="Xpander" className="w-10 h-6 object-contain" />
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-800 block leading-tight">Xpander 2020</span>
              <span className="text-[8px] text-emerald-600 font-bold block flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isSimulating ? 'Dữ liệu mô phỏng' : 'Dữ liệu xe thật'}
              </span>
            </div>
          </div>
        ) : isConnected ? (
          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 text-blue-700 animate-in fade-in duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <div className="text-right">
              <span className="text-[9px] font-bold block leading-tight">ESP32 đã nối</span>
              <span className="text-[8px] text-blue-500 block">Đang đọc PIDs</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span className="text-[10px] font-bold">Chưa kết nối</span>
          </div>
        )}
      </div>

      {/* Top Segmented Tab: Dashboard | Lịch sử bản ghi */}
      <div className="p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 flex items-center mb-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Trực tiếp (37 PIDs)
        </button>
        <button
          onClick={() => setActiveTab('past_recordings')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'past_recordings'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Bản ghi ({recordings.length})
        </button>
      </div>

      {/* TAB 1: Past Recordings */}
      {activeTab === 'past_recordings' && (
        <div className="space-y-2">
          {recordings.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
              Chưa có bản ghi nào. Hãy bấm "Ghi dữ liệu" khi đang xem Live Data.
            </div>
          ) : (
            recordings.map((rec) => (
              <div key={rec.id} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Bản ghi lúc {rec.date}</span>
                  <span className="text-blue-600">{rec.samples} mẫu</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <div>Vòng tua đỉnh: <strong className="text-slate-800">{rec.peakRpm} RPM</strong></div>
                  <div>Tốc độ cao nhất: <strong className="text-slate-800">{rec.topSpeed} km/h</strong></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Dashboard */}
      {activeTab === 'dashboard' && (
        <>
          {!isConnected ? (
            <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
              <div className="flex-1 flex flex-col justify-center items-center max-w-xs">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                  <Gauge className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Kết nối ESP32 để đọc Live Data
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Xem toàn bộ 37 thông số động cơ Mitsubishi Xpander theo thời gian thực chuẩn SAE J1979.
                </p>
              </div>

              <button
                onClick={onConnectScanTool}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 transition active:scale-[0.98] mt-4"
              >
                KẾT NỐI ESP32 NGAY
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Controls bar: 2 View Modes (Đồng hồ / Danh sách) + Record */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                  <button
                    onClick={() => setViewMode('gauges')}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 ${
                      viewMode === 'gauges' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Đồng hồ đo</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 ${
                      viewMode === 'list' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Danh sách (37)</span>
                  </button>
                </div>

                {/* Record Button */}
                <button
                  onClick={handleToggleRecord}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Dừng ({history.length})</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-rose-500" />
                      <span>Ghi log</span>
                    </>
                  )}
                </button>
              </div>

              {/* Horizontal Category Filter Pills (dùng chung cho cả Đồng hồ & Danh sách) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-0.5">
                {LIVE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition border ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.nameVi} ({cat.count})
                  </button>
                ))}
              </div>

              {/* ======================================================== */}
              {/* CHẾ ĐỘ 1: ĐỒNG HỒ HIỂN THỊ TOÀN BỘ 37 THÔNG SỐ (GAUGES)   */}
              {/* ======================================================== */}
              {viewMode === 'gauges' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* 2 Đồng hồ kim tròn trung tâm: Vòng tua máy RPM & Tốc độ Speed */}
                  {(selectedCategory === 'all' || selectedCategory === 'engine') && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <GaugeMeter
                        value={sensor.rpm}
                        min={0}
                        max={7000}
                        label="Vòng tua (4A91)"
                        unit="RPM"
                        color="#2563eb"
                        warningThreshold={4500}
                        dangerThreshold={6000}
                        size={155}
                      />
                      <GaugeMeter
                        value={sensor.speed}
                        min={0}
                        max={220}
                        label="Tốc độ xe"
                        unit="km/h"
                        color="#0d9488"
                        warningThreshold={120}
                        dangerThreshold={160}
                        size={155}
                      />
                    </div>
                  )}

                  {/* DANH SÁCH TẤT CẢ CÁC ĐỒNG HỒ ĐO LIVE DATA (Mỗi thông số là 1 đồng hồ đo thanh/thước) */}
                  <div className="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-0.5">
                    {filteredPids.map((item) => {
                      const val = item.getValue(sensor);
                      const min = item.min ?? 0;
                      const max = item.max ?? 100;
                      const { percent, isNumeric } = getGaugeProgress(val, min, max);
                      const colors = getCategoryColor(item.category);
                      const isExpanded = expandedPid === item.pid;

                      return (
                        <div
                          key={item.pid}
                          className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all"
                        >
                          {/* Dòng 1: Mã PID, Tên thông số và Giá trị số lớn */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-blue-900 border border-slate-200">
                                  0x{item.pid}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${colors.badge}`}>
                                  {item.shortName}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-800 mt-1 truncate">
                                {item.nameVi}
                              </h4>
                            </div>

                            {/* Đồng hồ số hiển thị giá trị */}
                            <div className="text-right shrink-0">
                              <div className="font-mono text-base font-black text-slate-950 flex items-baseline justify-end gap-1">
                                <span>{val}</span>
                                {item.unit && (
                                  <span className="text-[10px] font-bold text-slate-500 font-sans">
                                    {item.unit}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-medium text-slate-400 block">
                                Chuẩn: {item.stdRange.split('(')[0]}
                              </span>
                            </div>
                          </div>

                          {/* Dòng 2: Thanh đồng hồ đo mức (Meter Level Gauge Bar) */}
                          {isNumeric ? (
                            <div className="mt-2.5 space-y-1">
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0.5">
                                <span>{min} {item.unit}</span>
                                <span className="font-bold text-slate-600">{percent}%</span>
                                <span>{max} {item.unit}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Trạng thái hệ thống:</span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Hoạt động chuẩn ({val})
                              </span>
                            </div>
                          )}

                          {/* Chi tiết vị trí cảm biến trên xe Xpander */}
                          <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                            <button
                              onClick={() => setExpandedPid(isExpanded ? null : item.pid)}
                              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 ml-auto"
                            >
                              <span>{isExpanded ? 'Ẩn vị trí' : 'Xem vị trí trên xe'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-1.5 p-2 bg-slate-50 rounded-xl text-[10px] text-slate-600 border border-slate-150 animate-in fade-in duration-150">
                              <div className="font-semibold text-slate-700 mb-0.5">Vị trí lắp đặt trên Xpander:</div>
                              <div className="leading-relaxed">{item.locationVi}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* CHẾ ĐỘ 2: DANH SÁCH 37 THÔNG SỐ (XPANDER 37 PIDs LIST)   */}
              {/* ======================================================== */}
              {viewMode === 'list' && (
                <div className="space-y-2.5 animate-in fade-in duration-200">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo PID (0C, 04, 14...) hoặc tên thông số..."
                      className="w-full bg-white pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* List of 37 PIDs Cards */}
                  <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
                    {filteredPids.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Không tìm thấy thông số nào khớp với từ khóa "{searchQuery}"
                      </div>
                    ) : (
                      filteredPids.map((item) => {
                        const val = item.getValue(sensor);
                        const isExpanded = expandedPid === item.pid;

                        return (
                          <div
                            key={item.pid}
                            className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-blue-900 border border-slate-200">
                                    0x{item.pid}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {item.shortName}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 mt-0.5">
                                  {item.nameVi}
                                </h4>
                                <span className="text-[10px] text-slate-400 block">
                                  {item.nameEn}
                                </span>
                              </div>

                              {/* Value Display */}
                              <div className="text-right shrink-0">
                                <div className="font-mono text-base font-black text-slate-950 flex items-baseline justify-end gap-1">
                                  <span>{val}</span>
                                  {item.unit && (
                                    <span className="text-[10px] font-bold text-slate-500 font-sans">
                                      {item.unit}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setExpandedPid(isExpanded ? null : item.pid)}
                                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 ml-auto mt-0.5"
                                >
                                  <span>Chi tiết</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Technical Details */}
                            {isExpanded && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                                <div className="flex items-start gap-1 text-slate-600">
                                  <span className="font-semibold text-slate-500 shrink-0">Dải chuẩn:</span>
                                  <span className="font-mono text-emerald-700 font-bold">{item.stdRange}</span>
                                </div>
                                <div className="flex items-start gap-1 text-slate-600">
                                  <span className="font-semibold text-slate-500 shrink-0">Vị trí xe:</span>
                                  <span className="text-slate-700 leading-tight">{item.locationVi}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
