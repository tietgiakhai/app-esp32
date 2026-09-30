import React, { useState, useEffect } from 'react';
import { ConnectionStatus, SensorData } from '../types/obd';
import { GaugeMeter } from '../components/Gauges/GaugeMeter';
import { LiveChart } from '../components/Gauges/LiveChart';
import { ObdProtocol } from '../services/obdProtocol';
import { bleService } from '../services/bleService';
import { Play, Square, Activity } from 'lucide-react';

interface LiveDataScreenProps {
  status: ConnectionStatus;
  onConnectScanTool: () => void;
}

export const LiveDataScreen: React.FC<LiveDataScreenProps> = ({
  status,
  onConnectScanTool
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'past_recordings'>('dashboard');
  const [viewMode, setViewMode] = useState<'gauges' | 'charts'>('gauges');
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isVehicleLinked, setIsVehicleLinked] = useState(bleService.isVehicleLinked());

  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange((linked) => {
      setIsVehicleLinked(linked);
    });
    return () => unsub();
  }, []);

  const [sensor, setSensor] = useState<SensorData>({
    rpm: 0,
    speed: 0,
    coolantTemp: 0,
    throttle: 0,
    engineLoad: 0,
    intakeTemp: 0,
    fuelLevel: 0,
    voltage: 13.6,
    timestamp: Date.now()
  });

  const [history, setHistory] = useState<{ time: number; rpm: number; speed: number; coolantTemp: number }[]>([]);
  const isConnected = status === 'connected';

  // Live polling loop
  useEffect(() => {
    if (!isConnected) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const data = await ObdProtocol.queryLiveData();
        if (isMounted) {
          setSensor(data);
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
      }
    }, 250);

    return () => {
      isMounted = false;
      clearInterval(interval);
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
            <span className="text-[9px] text-slate-500">Live Telemetry System</span>
          </div>
        </div>

        {/* Thumbnail xe Xpander - CHỈ HIỆN KHI ĐÃ LIÊN KẾT VỚI XE */}
        {isVehicleLinked ? (
          <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 animate-in fade-in duration-300">
            <img src="/car-xpander.png" alt="Xpander" className="w-10 h-6 object-contain" />
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-800 block leading-tight">Xpander 2020</span>
              <span className="text-[8px] text-emerald-600 font-bold block">Đã liên kết xe</span>
            </div>
          </div>
        ) : isConnected ? (
          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 text-blue-700 animate-in fade-in duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <div className="text-right">
              <span className="text-[9px] font-bold block leading-tight">ESP32 đã nối</span>
              <span className="text-[8px] text-blue-500 block">Chờ ECU xe</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span className="text-[10px] font-bold">Chưa liên kết xe</span>
          </div>
        )}
      </div>

      {/* Top Segmented Tab: Dashboard | Past Recordings */}
      <div className="p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 flex items-center mb-4">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('past_recordings')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'past_recordings'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Past Recordings
        </button>
      </div>

      {/* TAB 1: Past Recordings */}
      {activeTab === 'past_recordings' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>{isConnected ? 'SAVED TELEMETRY LOGS (XPANDER)' : 'SAVED TELEMETRY LOGS'}</span>
            <span>{recordings.length} SESSIONS</span>
          </div>

          {recordings.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2">
              <Activity className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">Chưa có phiên ghi dữ liệu nào</p>
              <p className="text-xs text-slate-400">
                {isConnected 
                  ? 'Kết nối thiết bị và bấm "Ghi dữ liệu" trên Dashboard để lưu trữ chu kỳ vận hành động cơ Xpander.'
                  : 'Kết nối thiết bị và bấm "Ghi dữ liệu" trên Dashboard để lưu trữ chu kỳ vận hành động cơ.'}
              </p>
            </div>
          ) : (
            recordings.map(rec => (
              <div key={rec.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <img src="/logo-bachkhoa.png" alt="BK" className="w-3.5 h-3.5 object-contain" />
                    <span className="font-bold text-slate-800 text-sm">{isConnected ? `Xpander Session ${rec.date}` : `Telemetry Session ${rec.date}`}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    {rec.samples} Points
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1 border-t border-slate-50">
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
          {/* Subcase 2A: Disconnected State */}
          {!isConnected ? (
            <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
              <div className="flex-1 flex flex-col justify-center items-center max-w-xs">
                {/* Graphic Illustration */}
                <div className="w-48 h-32 mb-4">
                  <svg viewBox="0 0 200 120" fill="none" className="w-full h-full">
                    <rect x="25" y="15" width="46" height="85" rx="9" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
                    <line x1="40" y1="92" x2="56" y2="92" stroke="#1D70B8" strokeWidth="2.5" strokeLinecap="round" />
                    <path
                      d="M 90 45 L 110 45 M 105 40 L 110 45 L 105 50"
                      stroke="#0D9488"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 110 65 L 90 65 M 95 60 L 90 65 L 95 70"
                      stroke="#0D9488"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect x="125" y="60" width="30" height="22" rx="4" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
                    <rect x="150" y="15" width="38" height="85" rx="8" stroke="#1D70B8" strokeWidth="3" fill="#FFFFFF" />
                    <rect x="156" y="24" width="26" height="24" rx="3" stroke="#1D70B8" strokeWidth="2" fill="#F8FAFC" />
                    <circle cx="163" cy="62" r="2.5" fill="#1D70B8" />
                    <circle cx="175" cy="62" r="2.5" fill="#1D70B8" />
                    <circle cx="169" cy="72" r="3" fill="#1D70B8" />
                  </svg>
                </div>

                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <img src="/logo-bachkhoa.png" alt="BK" className="w-4 h-4 object-contain" />
                  <span className="text-xs font-bold text-blue-900">HCMUT OBD-II</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Pair a tool to view Live Data
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Kết nối thiết bị để xem cảm biến xe theo thời gian thực.
                </p>
              </div>

              {/* Big Blue Button: Connect Scan Tool */}
              <button
                onClick={onConnectScanTool}
                className="w-full py-3.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-xl text-base font-semibold shadow-sm transition active:scale-[0.98] mt-4"
              >
                Connect Scan Tool
              </button>
            </div>
          ) : (
            /* Subcase 2B: Connected State */
            <div className="space-y-3.5">
              {/* Controls bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('gauges')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      viewMode === 'gauges' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Đồng hồ kim
                  </button>
                  <button
                    onClick={() => setViewMode('charts')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      viewMode === 'charts' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Đồ thị sóng
                  </button>
                </div>

                {/* Record Button */}
                <button
                  onClick={handleToggleRecord}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng ghi ({history.length})</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-red-500" />
                      <span>Ghi dữ liệu</span>
                    </>
                  )}
                </button>
              </div>

              {/* View 1: Gauges */}
              {viewMode === 'gauges' ? (
                <div className="space-y-3">
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
                      label={isConnected ? "Tốc độ Xpander" : "Tốc độ xe"}
                      unit="km/h"
                      color="#0d9488"
                      warningThreshold={120}
                      dangerThreshold={160}
                      size={155}
                    />
                  </div>

                  {/* Secondary Sensor Cards Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nhiệt độ nước
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.coolantTemp}°C
                      </span>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full inline-block mt-0.5">
                        Ổn định
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Bướm ga ETV
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.throttle}%
                      </span>
                      <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded-full inline-block mt-0.5">
                        MIVEC
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tải động cơ
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.engineLoad}%
                      </span>
                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded-full inline-block mt-0.5">
                        Calculated
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Khí nạp IAT
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.intakeTemp}°C
                      </span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        Ambient
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Bình xăng (45L)
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.fuelLevel}%
                      </span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        Xăng RON95
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Điện áp ắc quy
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                        {sensor.voltage}V
                      </span>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full inline-block mt-0.5">
                        Máy phát tốt
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* View 2: Real-time Charts */
                <div className="space-y-3">
                  <LiveChart
                    data={history}
                    metric="rpm"
                    label={isConnected ? "Vòng tua động cơ Xpander (RPM)" : "Vòng tua động cơ (RPM)"}
                    unit="RPM"
                    color="#2563eb"
                  />
                  <LiveChart
                    data={history}
                    metric="speed"
                    label={isConnected ? "Tốc độ xe Xpander (km/h)" : "Tốc độ xe (km/h)"}
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
