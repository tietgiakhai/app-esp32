export type ToolType = 'dongle' | 'handheld';

export type ScreenType = 
  | 'home' 
  | 'pairing_guide' 
  | 'live_data' 
  | 'diagnostics' 
  | 'vehicle_info' 
  | 'report_history' 
  | 'support'
  | 'obd_hub'
  | 'terminal';

export interface BleLogEntry {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX' | 'INFO' | 'ERR';
  text: string;
}

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export interface SensorData {
  // 1. Động cơ & Vận hành (Engine)
  rpm: number;                  // 010C
  speed: number;                // 010D
  engineLoad: number;           // 0104
  absLoad?: number;             // 0143
  timingAdvance?: number;       // 010E
  runTime?: number;             // 011F

  // 2. Khí nạp & Nhiên liệu (Fuel & Intake)
  coolantTemp: number;          // 0105
  intakeTemp: number;           // 010F
  mapKpa?: number;              // 010B
  baroPressure?: number;        // 0133
  ambientTemp?: number;         // 0146
  fuelLevel: number;            // 012F
  fuelSystemStatus?: string;    // 0103 (CL / OL)
  stftB1?: number;              // 0106
  ltftB1?: number;              // 0107
  lambdaCmd?: number;           // 0144
  evapPurge?: number;           // 012E
  fuelType?: string;            // 0151

  // 3. Bướm ga & Chân ga (Throttle & Accelerator)
  throttle: number;             // 0111
  throttleB?: number;           // 0147
  relThrottle?: number;         // 0145
  cmdThrottle?: number;         // 014C
  pedalD?: number;              // 0149
  pedalE?: number;              // 014A
  pedalRel?: number;            // 015A

  // 4. Khí xả & Cảm biến Oxy (Emissions & O2)
  o2s1Volt?: number;            // 0114
  o2s1Trim?: number;            // 0114
  o2s2Volt?: number;            // 0115
  o2s2Trim?: number;            // 0115
  o2Locations?: string;         // 0113
  obdType?: string;             // 011C

  // 5. Điện áp & Giám sát lỗi (ECU & Status)
  voltage: number;              // 0142 / ATRV
  milOn?: boolean;              // 0101
  dtcCount?: number;            // 0101
  warmupsSinceClear?: number;   // 0130
  distanceSinceClear?: number;  // 0131
  milDistance?: number;         // 0121

  timestamp: number;
}

export interface LivePidDefinition {
  pid: string;
  codeHex: string;
  nameVi: string;
  nameEn: string;
  shortName: string;
  category: 'engine' | 'fuel_intake' | 'throttle' | 'exhaust_o2' | 'ecu_status';
  unit: string;
  min: number;
  max: number;
  stdRange: string;
  locationVi: string;
  getValue: (s: SensorData) => number | string;
}

export interface DTC {
  code: string;
  category: 'Powertrain' | 'Chassis' | 'Body' | 'Network';
  descriptionEn: string;
  descriptionVi: string;
  severity: 'Critical' | 'Warning' | 'Info';
  status: 'Stored' | 'Pending' | 'Permanent';
  symptoms: string[];
  possibleCauses: string[];
}

export interface VehicleInfo {
  vin: string;
  manufacturer: string;
  model: string;
  engine: string;
  transmission: string;
  modelYear: string;
  color: string;
  country: string;
  protocol: string;
  ecuCount: number;
  batteryVoltage: string;
  milStatus: boolean;
  isReadFromEcu: boolean;
  readTimestamp?: string;
}

export interface DiagnosticReport {
  id: string;
  timestamp: string;
  vin: string;
  carName: string;
  dtcCount: number;
  dtcs: DTC[];
  notes?: string;
}

export interface BleDevice {
  id: string;
  name: string;
  rssi?: number;
}
