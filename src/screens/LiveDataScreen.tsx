import React, { useState, useEffect } from 'react';
import { ConnectionStatus, SensorData } from '../types/obd';
import { GaugeMeter } from '../components/Gauges/GaugeMeter';
import { LiveChart } from '../components/Gauges/LiveChart';
import { ObdProtocol } from '../services/obdProtocol';
import { bleService } from '../services/bleService';
import { XPANDER_LIVE_PIDS, LIVE_CATEGORIES } from '../services/xpanderPids';
import { Play, Square, Search, ChevronDown, ChevronUp, Layers, Gauge, LineChart, Info, CheckCircle2 } from 'lucide-react';

interface LiveDataScreenProps {
  status: ConnectionStatus;
  onConnectScanTool: () => void;
}

export const LiveDataScreen: React.FC<LiveDataScreenProps> = ({
  status,
  onConnectScanTool
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'past_recordings'>('dashboard');
  const [viewMode, setViewMode] = useState<'gauges' | 'list' | 'charts'>('list');
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
          // Lên lịch lần quét tiếp theo sau khi lần trước đã phản hồi
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
              {/* Controls bar: 3 View Modes + Record */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 ${
                      viewMode === 'list' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>37 PIDs</span>
                  </button>
                  <button
                    onClick={() => setViewMode('gauges')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 ${
                      viewMode === 'gauges' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Đồng hồ</span>
                  </button>
                  <button
                    onClick={() => setViewMode('charts')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 ${
                      viewMode === 'charts' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    <span>Đồ thị</span>
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
                      <span>Dừng ghi ({history.length})</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-rose-500" />
                      <span>Ghi log</span>
                    </>
                  )}
                </button>
              </div>

              {/* ======================================================== */}
              {/* CHẾ ĐỘ 1: DANH SÁCH TOÀN BỘ 37 THÔNG SỐ (XPANDER 37 PIDs) */}
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

                  {/* Horizontal Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
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

              {/* ======================================================== */}
              {/* CHẾ ĐỘ 2: ĐỒNG HỒ KIM TRỰC QUAN (GAUGES VIEW)            */}
              {/* ======================================================== */}
              {viewMode === 'gauges' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-2.5">
                    <GaugeMeter
                      value={sensor.rpm}
                      min={0}
                      max={7000}
                      label="Vòng tua máy (4A91)"
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
                      label="Tốc độ xe Xpander"
                      unit="km/h"
                      color="#0d9488"
                      warningThreshold={120}
                      dangerThreshold={160}
                      size={155}
                    />
                  </div>

                  {/* 6 Quick Dashboard Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nước làm mát
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.coolantTemp}°C
                      </span>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded-full inline-block mt-0.5">
                        Chuẩn (80-95)
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Bướm ga TPS
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.throttle}%
                      </span>
                      <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded-full inline-block mt-0.5">
                        Kênh 1
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tải động cơ
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.engineLoad}%
                      </span>
                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded-full inline-block mt-0.5">
                        Calculated
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Áp suất nạp MAP
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.mapKpa ?? 43} kPa
                      </span>
                      <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded-full inline-block mt-0.5">
                        Hút khí tự nhiên
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Góc đánh lửa
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.timingAdvance ?? 11}°
                      </span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        BTDC #1
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Điện áp ECU
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {typeof sensor.voltage === 'number' ? sensor.voltage.toFixed(2) : sensor.voltage}V
                      </span>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded-full inline-block mt-0.5">
                        Máy phát tốt
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* CHẾ ĐỘ 3: ĐỒ THỊ SÓNG THỜI GIAN THỰC (CHARTS VIEW)       */}
              {/* ======================================================== */}
              {viewMode === 'charts' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <LiveChart
                    data={history}
                    metric="rpm"
                    label="Vòng tua động cơ Mitsubishi Xpander (RPM)"
                    unit="RPM"
                    color="#2563eb"
                  />
                  <LiveChart
                    data={history}
                    metric="speed"
                    label="Tốc độ xe Xpander (km/h)"
                    unit="km/h"
                    color="#0d9488"
                  />
                  <LiveChart
                    data={history}
                    metric="coolantTemp"
                    label="Nhiệt độ nước làm mát động cơ (°C)"
                    unit="°C"
                    color="#f59e0b"
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
