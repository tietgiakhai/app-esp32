import React from 'react';

interface DataPoint {
  time: number;
  rpm: number;
  speed: number;
  coolantTemp: number;
}

interface LiveChartProps {
  data: DataPoint[];
  metric: 'rpm' | 'speed' | 'coolantTemp';
  label: string;
  color?: string;
  unit: string;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  data,
  metric,
  label,
  color = '#1b73e8',
  unit
}) => {
  if (data.length < 2) {
    return (
      <div className="h-44 bg-slate-50 rounded-2xl flex items-center justify-center text-xs text-slate-400">
        Waiting for stream data...
      </div>
    );
  }

  const values = data.map(d => d[metric]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, minVal + 1);
  const latestVal = values[values.length - 1];

  // Kích thước SVG
  const width = 340;
  const height = 120;
  const padding = 15;

  const points = values.map((val, index) => {
    const x = padding + (index / (values.length - 1)) * (width - 2 * padding);
    const normalizedY = (val - minVal) / (maxVal - minVal);
    const y = height - padding - normalizedY * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-slate-800">{Math.round(latestVal)}</span>
            <span className="text-xs text-slate-400 font-medium">{unit}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Real-time 5Hz
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Đường lưới ngang mờ */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeDasharray="3 3" />

          {/* Vùng đổ bóng gradient */}
          <path d={areaD} fill={`url(#grad-${metric})`} />

          {/* Đường biểu đồ chính */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Điểm nút hiện tại */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="4"
              fill={color}
              className="animate-ping"
            />
          )}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-50">
        <span>Min: {Math.round(minVal)} {unit}</span>
        <span>Max: {Math.round(maxVal)} {unit}</span>
      </div>
    </div>
  );
};
