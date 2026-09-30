export type ToolType = 'dongle' | 'handheld';

export type ScreenType = 
  | 'home' 
  | 'pairing_guide' 
  | 'live_data' 
  | 'diagnostics' 
  | 'vehicle_info' 
  | 'report_history' 
  | 'support'
  | 'obd_hub';

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export interface SensorData {
  rpm: number;
  speed: number;
  coolantTemp: number;
  throttle: number;
  engineLoad: number;
  intakeTemp: number;
  fuelLevel: number;
  voltage: number;
  timestamp: number;
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
