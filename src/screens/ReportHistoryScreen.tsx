import React, { useState, useEffect } from 'react';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import { DiagnosticReport } from '../types/obd';
import { bleService } from '../services/bleService';

export const ReportHistoryScreen: React.FC = () => {
  const [isVehicleLinked, setIsVehicleLinked] = useState(bleService.isVehicleLinked());

  useEffect(() => {
    const unsub = bleService.onVehicleLinkChange((linked) => {
      setIsVehicleLinked(linked);
    });
    return () => unsub();
  }, []);

  const sampleReports: DiagnosticReport[] = [
    {
      id: 'REP-001',
      timestamp: '29/09/2026 21:40',
      vin: isVehicleLinked ? 'MK2NC1W09LP128945' : '•••••••••••••••••',
      carName: isVehicleLinked ? 'Mitsubishi Xpander 2020' : 'Hồ sơ kiểm tra xe (OBD-II)',
      dtcCount: 2,
      dtcs: [
        {
          code: 'P0300',
          category: 'Powertrain',
          descriptionEn: 'Random Misfire',
          descriptionVi: 'Phát hiện bỏ lửa ngẫu nhiên',
          severity: 'Critical',
          status: 'Stored',
          symptoms: [],
          possibleCauses: []
        },
        {
          code: 'P0171',
          category: 'Powertrain',
          descriptionEn: 'System Too Lean Bank 1',
          descriptionVi: 'Hệ thống nhiên liệu nghèo xăng',
          severity: 'Warning',
          status: 'Stored',
          symptoms: [],
          possibleCauses: []
        }
      ]
    },
    {
      id: 'REP-002',
      timestamp: '25/09/2026 08:30',
      vin: isVehicleLinked ? 'MK2NC1W09LP128945' : '•••••••••••••••••',
      carName: isVehicleLinked ? 'Mitsubishi Xpander 2020' : 'Hồ sơ kiểm tra xe (OBD-II)',
      dtcCount: 0,
      dtcs: []
    }
  ];

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
              <span className="text-[9px] text-slate-500">Lịch sử chẩn đoán OBD-II</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
            <span className="text-[10px] font-bold text-blue-800">ISO 15765-4</span>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="text-lg font-black text-slate-900">Lịch sử Chẩn đoán (Report History)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Hồ sơ dữ liệu quét lỗi và kiểm tra xe qua cổng OBD-II</p>
        </div>
      </div>

      <div className="space-y-3">
        {sampleReports.map(report => (
          <div
            key={report.id}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  report.dtcCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{report.carName}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{report.timestamp}</span>
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                report.dtcCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {report.dtcCount > 0 ? `${report.dtcCount} Mã lỗi` : 'Đạt chuẩn'}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px]">VIN: {report.vin}</span>
              <div className="flex items-center gap-1 text-blue-600 font-semibold hover:underline">
                <span>Xem chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
