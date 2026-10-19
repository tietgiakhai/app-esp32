import React, { useState, useEffect, useRef } from 'react';
import { ConnectionStatus, BleLogEntry } from '../types/obd';
import { bleService } from '../services/bleService';
import { Terminal, Send, Trash2, ArrowDownCircle, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface TerminalScreenProps {
  status: ConnectionStatus;
  onOpenConnectModal: () => void;
  onBack: () => void;
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  status,
  onOpenConnectModal,
  onBack
}) => {
  const isConnected = status === 'connected';
  const isSimulating = bleService.isSimulating();
  const [logs, setLogs] = useState<BleLogEntry[]>(bleService.getLogEntries());
  const [customCmd, setCustomCmd] = useState('');
  const [sending, setSending] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = bleService.onLog((newLogs) => {
      setLogs(newLogs);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleSend = async (cmdToSend?: string) => {
    const cmd = (cmdToSend || customCmd).trim();
    if (!cmd || !isConnected) return;
    setSending(true);
    try {
      await bleService.sendCommand(cmd);
      if (!cmdToSend) setCustomCmd('');
    } catch (e) {
      console.error('Terminal send error:', e);
    } finally {
      setSending(false);
    }
  };

  const QUICK_COMMANDS = [
    { label: '010C (RPM)', cmd: '010C' },
    { label: '010D (Tốc độ)', cmd: '010D' },
    { label: '0105 (Nước)', cmd: '0105' },
    { label: '0902 (VIN)', cmd: '0902' },
    { label: '03 (Mã lỗi)', cmd: '03' },
    { label: '0100 (PIDs)', cmd: '0100' },
    { label: 'ATRV (Ắc quy)', cmd: 'ATRV' },
    { label: 'ATZ (Reset)', cmd: 'ATZ' },
  ];

  return (
    <div className="flex-1 max-w-md mx-auto w-full px-4 py-3 flex flex-col h-[calc(100vh-130px)] pb-24 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">OBD-II Terminal</h2>
            </div>
            <span className="text-[10px] text-slate-500">Giám sát gói tin RAW ESP32 & Xe</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => bleService.clearLogs()}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Xóa màn hình"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
              autoScroll ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            Cuộn tự động
          </button>
        </div>
      </div>

      {/* Terminal Console View */}
      <div className="flex-1 bg-slate-950 rounded-2xl p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 border border-slate-800 shadow-inner">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-4">
            <Terminal className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Chưa có gói tin truyền nhận</p>
            <p className="text-[10px] mt-1 text-slate-500">
              {isConnected
                ? 'Bấm một trong các nút lệnh nhanh bên dưới để gửi lệnh thử tới ESP32'
                : 'Chưa kết nối Bluetooth với ESP32'}
            </p>
          </div>
        ) : (
          logs.map((log) => {
            let badgeBg = 'bg-slate-800 text-slate-300';
            let textColor = 'text-slate-300';

            if (log.direction === 'TX') {
              badgeBg = 'bg-blue-900 text-blue-300';
              textColor = 'text-blue-400 font-bold';
            } else if (log.direction === 'RX') {
              badgeBg = 'bg-emerald-950 text-emerald-300';
              textColor = 'text-emerald-400';
            } else if (log.direction === 'ERR') {
              badgeBg = 'bg-rose-950 text-rose-300';
              textColor = 'text-rose-400';
            } else if (log.direction === 'INFO') {
              badgeBg = 'bg-amber-950 text-amber-300';
              textColor = 'text-amber-400';
            }

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[9px] text-slate-600 shrink-0 select-none pt-0.5">
                  {log.timestamp}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 select-none ${badgeBg}`}>
                  {log.direction}
                </span>
                <span className={`flex-1 break-all ${textColor}`}>
                  {log.text}
                </span>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>

      {/* Quick Commands Bar */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_COMMANDS.map((item) => (
          <button
            key={item.cmd}
            onClick={() => handleSend(item.cmd)}
            disabled={!isConnected || sending}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-[10px] font-bold whitespace-nowrap active:scale-95 transition disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Custom Command Input */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs flex items-center gap-2">
        <input
          type="text"
          value={customCmd}
          onChange={(e) => setCustomCmd(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isConnected ? 'Nhập lệnh OBD (vd: 010C, 0902, 03...)' : 'Hãy kết nối ESP32 trước...'}
          disabled={!isConnected}
          className="flex-1 bg-slate-50 px-3 py-2 rounded-xl text-xs font-mono text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 uppercase"
        />
        {isConnected ? (
          <button
            onClick={() => handleSend()}
            disabled={sending || !customCmd.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition active:scale-95 disabled:opacity-40"
            title="Gửi lệnh"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onOpenConnectModal}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
          >
            Nối Bluetooth
          </button>
        )}
      </div>
    </div>
  );
};
