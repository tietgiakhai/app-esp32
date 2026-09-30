import { DTC } from '../types/obd';

export const DTC_DATABASE: Record<string, Omit<DTC, 'code' | 'status'>> = {
  'P0300': {
    category: 'Powertrain',
    descriptionEn: 'Random/Multiple Cylinder Misfire Detected',
    descriptionVi: 'Phát hiện bỏ lửa ngẫu nhiên hoặc nhiều xi-lanh',
    severity: 'Critical',
    symptoms: [
      'Động cơ rung giật khi chạy không tải hoặc tăng tốc',
      'Đèn Check Engine nhấp nháy hoặc sáng liên tục',
      'Hao nhiên liệu bất thường, mùi xăng sống ở ống xả',
      'Mất công suất khi đạp ga'
    ],
    possibleCauses: [
      'Bugi đánh lửa bị mòn hoặc hỏng',
      'Bô-bin đánh lửa (Ignition Coil) chập chờn',
      'Kim phun nhiên liệu bị nghẹt hoặc bẩn',
      'Áp suất nén xi-lanh thấp',
      'Áp suất bơm xăng yếu'
    ]
  },
  'P0171': {
    category: 'Powertrain',
    descriptionEn: 'System Too Lean (Bank 1)',
    descriptionVi: 'Hệ thống nhiên liệu quá nghèo xăng (Bank 1)',
    severity: 'Warning',
    symptoms: [
      'Động cơ hụt hơi khi tăng ga',
      'Gằn máy hoặc nổ lụp bụp ở cổ hút',
      'Vòng tua không tải không ổn định'
    ],
    possibleCauses: [
      'Rò rỉ đường ống nạp khí (hút khí lọt sau cảm biến MAF)',
      'Cảm biến lưu lượng khí nạp (MAF) bị bám bụi bẩn',
      'Bơm nhiên liệu yếu hoặc lọc xăng bị tắc',
      'Cảm biến oxy (O2 Sensor) báo sai'
    ]
  },
  'P0420': {
    category: 'Powertrain',
    descriptionEn: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    descriptionVi: 'Hiệu suất bộ chuyển đổi xúc tác dưới ngưỡng cho phép (Bank 1)',
    severity: 'Warning',
    symptoms: [
      'Đèn Check Engine sáng',
      'Mùi khí thải nồng nặc hơn bình thường',
      'Không đạt tiêu chuẩn kiểm định khí thải'
    ],
    possibleCauses: [
      'Bầu lọc khí thải (Catalytic Converter) bị nghẹt hoặc chai hỏng',
      'Cảm biến oxy phía sau (Downstream O2 Sensor) báo sai',
      'Rò rỉ đường ống xả trước bầu catalytic',
      'Động cơ bị đốt không hết xăng làm hỏng chất xúc tác'
    ]
  },
  'P0102': {
    category: 'Powertrain',
    descriptionEn: 'Mass or Volume Air Flow Circuit Low Input',
    descriptionVi: 'Tín hiệu mạch cảm biến lưu lượng khí nạp (MAF) quá thấp',
    severity: 'Warning',
    symptoms: [
      'Khó nổ máy hoặc chết máy đột ngột',
      'Đạp ga xe bị lì, không bốc'
    ],
    possibleCauses: [
      'Cảm biến MAF bị tuột giắc cắm hoặc đứt dây',
      'Cảm biến MAF bị bám muội than, dầu nhớt',
      'Hộp ECU nhận tín hiệu điện áp dưới ngưỡng chuẩn'
    ]
  },
  'P0113': {
    category: 'Powertrain',
    descriptionEn: 'Intake Air Temperature Sensor 1 Circuit High Input',
    descriptionVi: 'Mạch cảm biến nhiệt độ khí nạp (IAT) tín hiệu quá cao',
    severity: 'Info',
    symptoms: [
      'Đèn Check Engine sáng',
      'Động cơ tiêu thụ nhiên liệu nhiều hơn bình thường'
    ],
    possibleCauses: [
      'Cảm biến IAT bị hở mạch hoặc rút giắc',
      'Cảm biến nhiệt độ khí nạp bị lỗi'
    ]
  },
  'P0500': {
    category: 'Powertrain',
    descriptionEn: 'Vehicle Speed Sensor (VSS) Malfunction',
    descriptionVi: 'Lỗi mạch cảm biến tốc độ xe (VSS)',
    severity: 'Critical',
    symptoms: [
      'Đồng hồ tốc độ trên bảng táp-lô không chạy hoặc nhảy loạn',
      'Hộp số tự động chuyển số giật cục hoặc không nhảy số'
    ],
    possibleCauses: [
      'Cảm biến tốc độ xe VSS bị hỏng',
      'Đứt dây tín hiệu hoặc lỏng giắc cắm đến ECU/TCM',
      'Bánh răng truyền động cảm biến tốc độ bị mòn'
    ]
  },
  'P0700': {
    category: 'Powertrain',
    descriptionEn: 'Transmission Control System Malfunction',
    descriptionVi: 'Yêu cầu kiểm tra hệ thống điều khiển hộp số tự động (TCM)',
    severity: 'Critical',
    symptoms: [
      'Hộp số rơi vào chế độ khẩn cấp (Limp Mode, kẹt ở số 3)',
      'Đèn báo lỗi hộp số / Check Engine sáng'
    ],
    possibleCauses: [
      'Lỗi van solenoid chuyển số',
      'Dầu hộp số bị thiếu hoặc thoái hóa',
      'Hộp TCM ghi nhận lỗi bên trong hộp số'
    ]
  }
};

export function lookupDTC(code: string, status: 'Stored' | 'Pending' | 'Permanent' = 'Stored'): DTC {
  const cleanCode = code.trim().toUpperCase();
  const known = DTC_DATABASE[cleanCode];
  
  if (known) {
    return {
      code: cleanCode,
      status,
      ...known
    };
  }

  // Phân loại mã lỗi tiêu chuẩn OBD-II
  let category: DTC['category'] = 'Powertrain';
  const prefix = cleanCode.charAt(0);
  if (prefix === 'C') category = 'Chassis';
  else if (prefix === 'B') category = 'Body';
  else if (prefix === 'U') category = 'Network';

  return {
    code: cleanCode,
    category,
    descriptionEn: `Diagnostic Trouble Code ${cleanCode}`,
    descriptionVi: `Mã chẩn đoán lỗi tiêu chuẩn ${cleanCode}`,
    severity: 'Warning',
    status,
    symptoms: ['Đèn báo lỗi động cơ (MIL) sáng'],
    possibleCauses: ['Cần dùng tài liệu kỹ thuật của hãng xe để tra cứu chuyên sâu']
  };
}
