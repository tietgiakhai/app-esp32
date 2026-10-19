import { BleDevice, ConnectionStatus, BleLogEntry } from '../types/obd';
import { Capacitor } from '@capacitor/core';
import { BleClient, textToDataView, dataViewToText } from '@capacitor-community/bluetooth-le';

// Các UUID BLE UART phổ biến nhất được dùng cho ESP32 và OBD-II Dongle
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Phone Writes to ESP32
export const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // ESP32 Notifies to Phone

export const ALL_OPTIONAL_SERVICES = [
  NUS_SERVICE_UUID,
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 / ESP32 Serial
  '0000fff0-0000-1000-8000-00805f9b34fb', // Microchip / Custom ESP32
  '4fafc201-1fb5-459e-8fcc-c5c9c331914b', // ESP32 BLE C++ Sample
  '000018f0-0000-1000-8000-00805f9b34fb', // OBD-II Dongle generic
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Viecar / OBDLink
  '0000ffe5-0000-1000-8000-00805f9b34fb',
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb'
];

export const isIosDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isWebBleSupported = (): boolean => {
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
};

type DataListener = (data: string) => void;
type StatusListener = (status: ConnectionStatus) => void;
type LogListener = (logs: BleLogEntry[]) => void;

class BleService {
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: StatusListener[] = [];
  private dataListeners: DataListener[] = [];
  private logListeners: LogListener[] = [];
  private connectedDevice: BleDevice | null = null;
  private isSimulator: boolean = false;
  private vehicleLinked: boolean = false;
  private vehicleLinkListeners: ((linked: boolean) => void)[] = [];
  
  // Lịch sử gói tin (TX / RX log)
  private logEntries: BleLogEntry[] = [];
  private maxLogs: number = 300;

  // Capacitor Native BLE handles
  private nativeDeviceId: string | null = null;
  private nativeServiceUuid: string = NUS_SERVICE_UUID;
  private nativeTxCharUuid: string = NUS_TX_CHAR_UUID;
  private nativeRxCharUuid: string = NUS_RX_CHAR_UUID;

  // Web Bluetooth handles
  private webBleDevice: any = null;
  private webBleServer: any = null;
  private rxCharacteristic: any = null;
  private txCharacteristic: any = null;

  // Simulator internal state (chỉ dùng khi test giả lập trên bàn)
  private simState = {
    rpm: 850,
    speed: 0,
    coolant: 88,
    throttle: 15,
    engineLoad: 24,
    intakeTemp: 34,
    fuel: 65,
    milOn: true,
    hasDtc: true,
    vin: 'MK2NC1W09LP128945', // Mitsubishi Xpander 2020
    time: 0
  };
  private simInterval: any = null;

  constructor() {
    this.startSimTicker();
  }

  private startSimTicker() {
    this.simInterval = setInterval(() => {
      this.simState.time += 0.1;
      const wave = Math.sin(this.simState.time);
      this.simState.rpm = Math.max(780, Math.round(900 + wave * 900 + 400));
      this.simState.speed = Math.max(0, Math.round(this.simState.rpm / 38));
      this.simState.throttle = Math.round(14 + (this.simState.rpm / 120));
      this.simState.engineLoad = Math.round(20 + (this.simState.rpm / 95));
      this.simState.coolant = 88 + Math.round(Math.sin(this.simState.time / 10) * 3);
    }, 200);
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getConnectedDevice(): BleDevice | null {
    return this.connectedDevice;
  }

  public isSimulating(): boolean {
    return this.isSimulator;
  }

  public isVehicleLinked(): boolean {
    return this.vehicleLinked;
  }

  public setVehicleLinked(linked: boolean) {
    this.vehicleLinked = linked;
    this.vehicleLinkListeners.forEach(l => l(linked));
  }

  public onVehicleLinkChange(callback: (linked: boolean) => void) {
    this.vehicleLinkListeners.push(callback);
    callback(this.vehicleLinked);
    return () => {
      this.vehicleLinkListeners = this.vehicleLinkListeners.filter(l => l !== callback);
    };
  }

  public onStatusChange(callback: StatusListener) {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  public onData(callback: DataListener) {
    this.dataListeners.push(callback);
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== callback);
    };
  }

  public onLog(callback: LogListener) {
    this.logListeners.push(callback);
    callback(this.logEntries);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== callback);
    };
  }

  public getLogEntries(): BleLogEntry[] {
    return [...this.logEntries];
  }

  public clearLogs() {
    this.logEntries = [];
    this.notifyLogs();
  }

  private addLog(direction: 'TX' | 'RX' | 'INFO' | 'ERR', text: string) {
    const entry: BleLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      direction,
      text: text.trim()
    };
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxLogs) {
      this.logEntries.shift();
    }
    this.notifyLogs();
  }

  private notifyLogs() {
    const copy = [...this.logEntries];
    this.logListeners.forEach(l => l(copy));
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach(l => l(status));
  }

  private emitData(data: string) {
    this.addLog('RX', data);
    this.dataListeners.forEach(l => l(data));
  }

  /**
   * Kết nối vào chế độ Giả lập (ESP32 Virtual Mode) - Dùng khi không có phần cứng
   */
  public async connectSimulator(): Promise<void> {
    this.setStatus('connecting');
    await new Promise(r => setTimeout(r, 400));
    this.isSimulator = true;
    this.connectedDevice = {
      id: 'SIMULATOR-001',
      name: 'ESP32-OBD2 (Virtual Simulator)',
      rssi: -42
    };
    this.addLog('INFO', 'Đã bật chế độ mô phỏng (Virtual Simulator)');
    this.setStatus('connected');
  }

  /**
   * Kết nối tới thiết bị đã chọn từ danh sách quét
   */
  public async connectDevice(device: BleDevice): Promise<void> {
    if (device.id.startsWith('SIMULATOR')) {
      return this.connectSimulator();
    }
    // Thiết bị thật -> kích hoạt quét và kết nối phần cứng thật
    await this.connectRealDevice(false);
  }

  /**
   * Quét và kết nối thiết bị Bluetooth LE THẬT (tương thích mọi code ESP32)
   */
  public async connectRealDevice(onlyNamed: boolean = false): Promise<BleDevice | null> {
    this.setStatus('scanning');
    this.addLog('INFO', 'Bắt đầu quét thiết bị Bluetooth xung quanh...');

    // 0. Chạy trên ứng dụng Native iOS / Android (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        await BleClient.initialize();
        this.addLog('INFO', 'Khởi tạo Capacitor BLE thành công');

        const device = await BleClient.requestDevice({
          optionalServices: ALL_OPTIONAL_SERVICES
        });

        this.setStatus('connecting');
        this.addLog('INFO', `Đang kết nối tới ${device.name || device.deviceId}...`);
        this.nativeDeviceId = device.deviceId;

        await BleClient.connect(device.deviceId, () => {
          this.addLog('ERR', 'Thiết bị ESP32 đã ngắt kết nối BLE');
          this.disconnect();
        });

        // Tự động nhận diện Service & Characteristic của ESP32 (không phụ thuộc vào UUID cố định)
        let foundTxService = NUS_SERVICE_UUID;
        let foundTxChar = NUS_TX_CHAR_UUID;
        let foundRxService = NUS_SERVICE_UUID;
        let foundRxChar = NUS_RX_CHAR_UUID;

        try {
          const services = await BleClient.getServices(device.deviceId);
          for (const s of services) {
            for (const c of s.characteristics) {
              if (c.properties.notify || c.properties.indicate) {
                foundTxService = s.uuid;
                foundTxChar = c.uuid;
              }
              if (c.properties.write || c.properties.writeWithoutResponse) {
                foundRxService = s.uuid;
                foundRxChar = c.uuid;
              }
            }
          }
        } catch (e) {
          console.warn('Lỗi đọc Services từ ESP32:', e);
        }

        this.nativeServiceUuid = foundRxService;
        this.nativeRxCharUuid = foundRxChar;
        this.nativeTxCharUuid = foundTxChar;

        // Đăng ký nhận dữ liệu từ ESP32
        try {
          await BleClient.startNotifications(
            device.deviceId,
            foundTxService,
            foundTxChar,
            (value) => {
              const text = dataViewToText(value);
              this.emitData(text);
            }
          );
          this.addLog('INFO', `Đã kích hoạt Notifications trên RX: ${foundTxChar.substring(0, 8)}...`);
        } catch (notifErr) {
          console.warn('Start notifications error:', notifErr);
          this.addLog('ERR', `Không thể bật Notify: ${String(notifErr)}`);
        }

        let displayName = device.name;
        if (!displayName || displayName.trim() === '') {
          displayName = `ESP32-OBD2 (${device.deviceId.slice(-4)})`;
        }

        this.isSimulator = false; // CHẮC CHẮN LÀ THIẾT BỊ THẬT, KHÔNG MÔ PHỎNG
        this.connectedDevice = {
          id: device.deviceId,
          name: displayName,
          rssi: -50
        };
        this.setStatus('connected');
        this.addLog('INFO', `✓ Đã kết nối thành công với thiết bị thật: ${displayName}`);
        return this.connectedDevice;
      } catch (nativeErr: any) {
        console.warn('Capacitor native BLE error or cancelled:', nativeErr);
        this.addLog('ERR', `Lỗi kết nối BLE: ${nativeErr.message || String(nativeErr)}`);
        this.setStatus('disconnected');
        return null;
      }
    }

    // 1. Chạy trên Trình duyệt Web (Chrome, Edge, Bluefy trên iOS)
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      try {
        let requestOptions: any;
        if (onlyNamed) {
          requestOptions = {
            filters: [
              { namePrefix: 'ESP' },
              { namePrefix: 'OBD' },
              { namePrefix: 'ELM' },
              { namePrefix: 'BK' },
              { namePrefix: 'Xpander' },
              { namePrefix: 'Car' },
              { namePrefix: 'BT' },
              { namePrefix: 'BLE' },
              { namePrefix: 'Auto' },
              { namePrefix: 'Diag' },
              { namePrefix: 'HCMUT' }
            ],
            optionalServices: ALL_OPTIONAL_SERVICES
          };
        } else {
          // Hiển thị TOÀN BỘ mọi thiết bị Bluetooth để người dùng chọn đúng ESP32 của mình
          requestOptions = {
            acceptAllDevices: true,
            optionalServices: ALL_OPTIONAL_SERVICES
          };
        }

        const device = await (navigator as any).bluetooth.requestDevice(requestOptions);

        this.setStatus('connecting');
        this.addLog('INFO', `Đang kết nối GATT tới ${device.name || device.id}...`);
        this.webBleDevice = device;
        
        device.addEventListener('gattserverdisconnected', () => {
          this.addLog('ERR', 'Thiết bị ESP32 đã ngắt kết nối');
          this.disconnect();
        });

        const server = await device.gatt.connect();
        this.webBleServer = server;

        // Tự động tìm kiếm Services & Characteristics của ESP32
        let services: any[] = [];
        try {
          services = await server.getPrimaryServices();
        } catch {
          for (const uuid of ALL_OPTIONAL_SERVICES) {
            try {
              const s = await server.getPrimaryService(uuid);
              if (s) services.push(s);
            } catch {}
          }
        }

        this.txCharacteristic = null;
        this.rxCharacteristic = null;

        for (const s of services) {
          try {
            const characteristics = await s.getCharacteristics();
            for (const c of characteristics) {
              if ((c.properties.notify || c.properties.indicate) && !this.txCharacteristic) {
                this.txCharacteristic = c;
              }
              if ((c.properties.write || c.properties.writeWithoutResponse) && !this.rxCharacteristic) {
                this.rxCharacteristic = c;
              }
            }
          } catch {}
        }

        if (this.txCharacteristic) {
          await this.txCharacteristic.startNotifications();
          this.txCharacteristic.addEventListener('characteristicvaluechanged', (e: any) => {
            const value = e.target.value;
            const text = new TextDecoder().decode(value);
            this.emitData(text);
          });
          this.addLog('INFO', 'Đã bật nhận dữ liệu Notify từ ESP32');
        }

        let displayName = device.name;
        if (!displayName || displayName.trim() === '') {
          displayName = `ESP32-OBD2 (${device.id.slice(-4)})`;
        }

        this.isSimulator = false; // CHẮC CHẮN LÀ THIẾT BỊ THẬT, KHÔNG MÔ PHỎNG
        this.connectedDevice = {
          id: device.id,
          name: displayName,
          rssi: -52
        };
        this.setStatus('connected');
        this.addLog('INFO', `✓ Đã kết nối thành công: ${displayName}`);
        return this.connectedDevice;
      } catch (err: any) {
        console.warn('Web Bluetooth error or cancelled:', err);
        if (err.name !== 'NotFoundError') {
          this.addLog('ERR', `Lỗi Web Bluetooth: ${err.message || String(err)}`);
        } else {
          this.addLog('INFO', 'Người dùng đã hủy chọn thiết bị Bluetooth');
        }
        this.setStatus('disconnected');
        return null;
      }
    }

    // 2. Nếu không hỗ trợ Bluetooth hoặc trên môi trường Web bị giới hạn
    this.addLog('ERR', 'Trình duyệt chưa hỗ trợ Web Bluetooth API');
    this.setStatus('disconnected');
    return null;
  }

  /**
   * Ngắt kết nối
   */
  public disconnect() {
    this.addLog('INFO', 'Đang ngắt kết nối thiết bị...');
    if (this.nativeDeviceId && Capacitor.isNativePlatform()) {
      BleClient.disconnect(this.nativeDeviceId).catch(console.warn);
      this.nativeDeviceId = null;
    }
    if (this.webBleDevice && this.webBleDevice.gatt && this.webBleDevice.gatt.connected) {
      this.webBleDevice.gatt.disconnect();
    }
    this.webBleDevice = null;
    this.webBleServer = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.connectedDevice = null;
    this.isSimulator = false;
    this.vehicleLinked = false;
    this.vehicleLinkListeners.forEach(l => l(false));
    this.setStatus('disconnected');
    this.addLog('INFO', 'Đã ngắt kết nối hoàn toàn');
  }

  /**
   * Gửi một lệnh ELM327 / OBD2 tới ESP32 và chờ phản hồi
   * Hỗ trợ tự động hoàn tất khi gặp '>', '\r', '\n' hoặc chuỗi kết quả chuẩn OBD
   */
  public async sendCommand(cmd: string, timeoutMs: number = 2000): Promise<string> {
    if (this.status !== 'connected') {
      throw new Error('Chưa kết nối thiết bị quét ESP32 OBD-II');
    }

    const clean = cmd.trim();
    this.addLog('TX', clean);

    // Nếu đang chạy Simulator thủ công
    if (this.isSimulator) {
      const simResp = await this.handleSimulatorCommand(clean);
      this.addLog('RX', simResp);
      return simResp;
    }

    // Bộ nhận diện xem phản hồi đã hoàn tất hay chưa
    const isResponseComplete = (buffer: string, command: string): boolean => {
      // 1. Kết thúc bằng dấu nhắc ELM327 '>'
      if (buffer.includes('>')) return true;

      const trimmed = buffer.trim();
      if (trimmed.length === 0) return false;

      // 2. Chứa các từ khóa kết thúc tiêu chuẩn
      if (
        trimmed.includes('OK') ||
        trimmed.includes('NO DATA') ||
        trimmed.includes('ERROR') ||
        trimmed.includes('UNABLE TO CONNECT') ||
        trimmed.includes('BUS INIT: ...ERROR') ||
        trimmed.includes('STOPPED') ||
        trimmed.includes('?')
      ) {
        return true;
      }

      // 3. Phản hồi Live Data (41 XX ...) khi có ký tự xuống dòng
      if (command.startsWith('01') && (buffer.includes('\r') || buffer.includes('\n'))) {
        if (trimmed.includes('41') || trimmed.includes('41 ')) {
          return true;
        }
      }

      // 4. Phản hồi xóa lỗi (04 -> 44)
      if (command === '04' && (trimmed.includes('44') || trimmed.includes('OK'))) {
        return true;
      }

      // 5. Điện áp bình ắc quy ATRV (ví dụ: 13.8V)
      if (command.toUpperCase() === 'ATRV' && trimmed.includes('V')) {
        return true;
      }

      // 6. Số VIN (0902): nếu đã nhận đủ 17 ký tự ASCII VIN hoặc 5 dòng frame
      if (command.startsWith('0902')) {
        const vinMatch = trimmed.match(/[A-HJ-NPR-Z0-9]{17}/i);
        if (vinMatch) return true;
      }

      return false;
    };

    // A. Chạy thiết bị thật qua Capacitor Native BLE (iOS / Android)
    if (this.nativeDeviceId && Capacitor.isNativePlatform()) {
      return new Promise<string>((resolve, reject) => {
        let responseBuffer = '';
        let debounceTimer: any = null;

        const timer = setTimeout(() => {
          cleanup();
          resolve(responseBuffer.trim());
        }, timeoutMs);

        const finish = () => {
          clearTimeout(timer);
          if (debounceTimer) clearTimeout(debounceTimer);
          cleanup();
          resolve(responseBuffer.replace('>', '').trim());
        };

        const onDataChunk = (text: string) => {
          responseBuffer += text;
          if (isResponseComplete(responseBuffer, clean)) {
            // Cho multi-line (VIN 0902 hoặc mã lỗi 03/07), chờ 60ms gom thêm frame
            if (clean.startsWith('0902') || clean === '03' || clean === '07') {
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(finish, 60);
            } else {
              finish();
            }
          }
        };

        const cleanup = this.onData(onDataChunk);
        const payload = textToDataView(clean + '\r');
        BleClient.write(this.nativeDeviceId!, this.nativeServiceUuid, this.nativeRxCharUuid, payload).catch((err: any) => {
          clearTimeout(timer);
          if (debounceTimer) clearTimeout(debounceTimer);
          cleanup();
          this.addLog('ERR', `Lỗi gửi lệnh Native: ${err.message || String(err)}`);
          reject(err);
        });
      });
    }

    // B. Chạy thiết bị thật qua Web Bluetooth
    if (this.rxCharacteristic) {
      return new Promise<string>((resolve, reject) => {
        let responseBuffer = '';
        let debounceTimer: any = null;

        const timer = setTimeout(() => {
          cleanup();
          resolve(responseBuffer.trim());
        }, timeoutMs);

        const finish = () => {
          clearTimeout(timer);
          if (debounceTimer) clearTimeout(debounceTimer);
          cleanup();
          resolve(responseBuffer.replace('>', '').trim());
        };

        const onDataChunk = (text: string) => {
          responseBuffer += text;
          if (isResponseComplete(responseBuffer, clean)) {
            if (clean.startsWith('0902') || clean === '03' || clean === '07') {
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(finish, 60);
            } else {
              finish();
            }
          }
        };

        const cleanup = this.onData(onDataChunk);
        const encoder = new TextEncoder();
        const payload = encoder.encode(clean + '\r');
        this.rxCharacteristic.writeValue(payload).catch((err: any) => {
          clearTimeout(timer);
          if (debounceTimer) clearTimeout(debounceTimer);
          cleanup();
          this.addLog('ERR', `Lỗi gửi lệnh Web BLE: ${err.message || String(err)}`);
          reject(err);
        });
      });
    }

    throw new Error('Giao thức truyền nhận Bluetooth không sẵn sàng');
  }

  /**
   * Bộ xử lý lệnh phản hồi giả lập (chỉ dùng khi người dùng chọn Simulator)
   */
  private async handleSimulatorCommand(cmd: string): Promise<string> {
    await new Promise(r => setTimeout(r, 30));
    const upper = cmd.toUpperCase().replace(/\s+/g, '');

    // AT Commands
    if (upper === 'ATZ' || upper === 'ATWS') return 'ELM327 v1.5 ESP32-OBD';
    if (upper.startsWith('AT')) return 'OK';

    // 09 02 - Read VIN
    if (upper === '0902') {
      const vin = this.simState.vin;
      let hex = '49 02 01';
      for (let i = 0; i < vin.length; i++) {
        hex += ' ' + vin.charCodeAt(i).toString(16).toUpperCase().padStart(2, '0');
      }
      return hex;
    }

    // 03 - Read Stored DTCs
    if (upper === '03') {
      if (this.simState.hasDtc) {
        return '43 02 03 00 01 71'; // P0300 và P0171
      }
      return '43 00';
    }

    // 07 - Read Pending DTCs
    if (upper === '07') {
      if (this.simState.hasDtc) {
        return '47 01 04 20'; // P0420
      }
      return '47 00';
    }

    // 04 - Erase DTCs
    if (upper === '04') {
      this.simState.hasDtc = false;
      this.simState.milOn = false;
      return '44';
    }

    // Live Data Mode 01
    if (upper.startsWith('01')) {
      const pid = upper.substring(2);

      // Supported PIDs
      if (pid === '00') return '41 00 BE 3F B8 13';
      if (pid === '20') return '41 20 80 07 E0 01';
      if (pid === '40') return '41 40 7E D0 00 00';

      // 1. Động cơ & Vận hành
      if (pid === '0C') {
        const raw = Math.round(this.simState.rpm * 4);
        const a = (raw >> 8) & 0xff;
        const b = raw & 0xff;
        return `41 0C ${a.toString(16).padStart(2, '0').toUpperCase()} ${b.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '0D') {
        const a = Math.round(this.simState.speed) & 0xff;
        return `41 0D ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '04') {
        const a = Math.round((this.simState.engineLoad * 255) / 100) & 0xff;
        return `41 04 ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '43') return '41 43 2A 3A'; // AbsLoad: 42.4%
      if (pid === '0E') return '41 0E 96';    // Timing: 11° BTDC
      if (pid === '1F') return '41 1F 01 BA'; // RunTime: 442s

      // 2. Khí nạp & Nhiên liệu
      if (pid === '05') {
        const a = Math.round(this.simState.coolant + 40) & 0xff;
        return `41 05 ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '0F') {
        const a = Math.round(this.simState.intakeTemp + 40) & 0xff;
        return `41 0F ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '0B') return '41 0B 2B';    // MAP: 43 kPa
      if (pid === '33') return '41 33 63';    // Baro: 99 kPa
      if (pid === '46') return '41 46 55';    // Ambient: 45 °C
      if (pid === '2F') {
        const a = Math.round((this.simState.fuel * 255) / 100) & 0xff;
        return `41 2F ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '03') return '41 03 02 00'; // FuelSys: Closed Loop
      if (pid === '06') return '41 06 7F';    // STFT: -0.78%
      if (pid === '07') return '41 07 80';    // LTFT: 0.0%
      if (pid === '44') return '41 44 80 00'; // Lambda: 1.000 λ
      if (pid === '2E') return '41 2E 23';    // EVAP: 13.7%
      if (pid === '51') return '41 51 01';    // FuelType: Gasoline

      // 3. Bướm ga & Chân ga
      if (pid === '11') {
        const a = Math.round((this.simState.throttle * 255) / 100) & 0xff;
        return `41 11 ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
      if (pid === '47') return '41 47 27';    // Thr B: 15.3%
      if (pid === '45') return '41 45 12';    // RelThr: 7.1%
      if (pid === '4C') return '41 4C 12';    // CmdThr: 7.1%
      if (pid === '49') return '41 49 30';    // Accel D: 18.8%
      if (pid === '4A') return '41 4A 18';    // Accel E: 9.4%
      if (pid === '5A') return '41 5A 00';    // PedalRel: 0.0%

      // 4. Khí xả & O2
      if (pid === '14') return '41 14 14 7F'; // O2S1: 0.10V, -0.78%
      if (pid === '15') return '41 15 A4 7F'; // O2S2: 0.82V, -0.78%
      if (pid === '13') return '41 13 03';    // O2 Mask
      if (pid === '1C') return '41 1C 06';    // EOBD

      // 5. Điện áp & Giám sát lỗi
      if (pid === '42') return '41 42 34 ED'; // ECU Volt: 13.55V
      if (pid === '01') {
        const milByte = this.simState.milOn ? 0x82 : 0x00;
        return `41 01 ${milByte.toString(16).padStart(2, '0').toUpperCase()} 00 00 00`;
      }
      if (pid === '21') return '41 21 00 00'; // MILDist: 0 km
      if (pid === '30') return '41 30 01';    // Warmups: 1
      if (pid === '31') return '41 31 00 00'; // DTCDist: 0 km
    }

    if (upper === 'ATRV') return '13.55V';
    return 'NO DATA';
  }
}

export const bleService = new BleService();
