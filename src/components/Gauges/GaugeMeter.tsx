import React from 'react';

interface GaugeMeterProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
  size?: number;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  min,
  max,
  label,
  unit,
  color = '#1b73e8',
  warningThreshold,
  dangerThreshold,
  size = 170
}) => {
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = (clampedValue - min) / (max - min);

  // Góc quay từ -135 độ đến +135 độ (tổng 270 độ)
  const angle = -135 + percentage * 270;
  
  // Xác định màu sắc theo ngưỡng cảnh báo
  let activeColor = color;
  if (dangerThreshold !== undefined && clampedValue >= dangerThreshold) {
    activeColor = '#ef4444'; // Red
  } else if (warningThreshold !== undefined && clampedValue >= warningThreshold) {
    activeColor = '#f59e0b'; // Amber
  }

  // Bán kính và chu vi vòng tròn
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  // Chỉ vẽ 3/4 cung tròn (270 độ / 360 độ = 0.75)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - percentage * arcLength;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-100 shadow-xs relative">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="w-full h-full transform rotate-135"
          viewBox="0 0 160 160"
        >
          {/* Vòng nền xám */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Vòng giá trị màu sắc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={activeColor}
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Nội dung trung tâm */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight text-slate-800 transition-all font-mono">
            {Math.round(clampedValue)}
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {unit}
          </span>
          <span className="text-xs font-semibold text-slate-600 mt-0.5">
            {label}
          </span>
        </div>
      </div>

      {/* Thanh giới hạn min - max */}
      <div className="w-full flex justify-between px-3 text-[10px] font-mono text-slate-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
