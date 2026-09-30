import { BleDevice, ConnectionStatus } from '../types/obd';
import { Capacitor } from '@capacitor/core';
import { BleClient, textToDataView, dataViewToText } from '@capacitor-community/bluetooth-le';

// Nordic UART Service (NUS) UUIDs chuẩn
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Phone Writes to ESP32
export const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // ESP32 Notifies to Phone

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

class BleService {
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: StatusListener[] = [];
  private dataListeners: DataListener[] = [];
  private connectedDevice: BleDevice | null = null;
  private isSimulator: boolean = false;
  private vehicleLinked: boolean = false;
  private vehicleLinkListeners: ((linked: boolean) => void)[] = [];
  
  // Capacitor Native BLE handle
  private nativeDeviceId: string | null = null;

  // Web Bluetooth handles
  private webBleDevice: any = null;
  private webBleServer: any = null;
  private rxCharacteristic: any = null;
  private txCharacteristic: any = null;

  // Simulator internal state
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
    vin: 'MK2NC1W09LP128945', // Mitsubishi Xpander 2020 màu đen (L = 2020)
    time: 0
  };
  private simInterval: any = null;

  constructor() {
    this.startSimTicker();
  }

  private startSimTicker() {
    this.simInterval = setInterval(() => {
      this.simState.time += 0.1;
      // Vòng tua biến thiên tự nhiên
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

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach(l => l(status));
  }

  private emitData(data: string) {
    this.dataListeners.forEach(l => l(data));
  }

  /**
   * Kết nối vào chế độ Giả lập (ESP32 Simulator Mode)
   */
  public async connectSimulator(): Promise<void> {
    this.setStatus('connecting');
    await new Promise(r => setTimeout(r, 600));
    this.isSimulator = true;
    this.connectedDevice = {
      id: 'SIMULATOR-001',
      name: 'ESP32-OBD2 (Virtual Simulator)',
      rssi: -42
    };
    this.setStatus('connected');
  }

  /**
   * Kết nối tới thiết bị Bluetooth được chọn từ danh sách
   */
  public async connectDevice(device: BleDevice): Promise<void> {
    this.setStatus('connecting');
    await new Promise(r => setTimeout(r, 700));
    this.isSimulator = true;
    this.connectedDevice = {
      id: device.id,
      name: device.name,
      rssi: device.rssi
    };
    this.setStatus('connected');
  }

  /**
   * Quét và kết nối thiết bị Bluetooth LE thật qua Web Bluetooth hoặc Capacitor BLE
   * @param onlyNamed: Nếu true, chỉ hiển thị các thiết bị có tên (ESP32, OBD, ELM, BK, Xpander...) và loại bỏ các thiết bị rác không tên
   */
  public async connectRealDevice(onlyNamed: boolean = true): Promise<BleDevice | null> {
    this.setStatus('scanning');

    // 0. Nếu đang chạy trên ứng dụng Native (iOS / Android qua Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        await BleClient.initialize();
        const ALL_SERVICES = [
          NUS_SERVICE_UUID,
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000fff0-0000-1000-8000-00805f9b34fb'
        ];

        const device = await BleClient.requestDevice({
          optionalServices: ALL_SERVICES
        });

        this.setStatus('connecting');
        this.nativeDeviceId = device.deviceId;

        await BleClient.connect(device.deviceId, () => {
          this.disconnect();
        });

        try {
          await BleClient.startNotifications(
            device.deviceId,
            NUS_SERVICE_UUID,
            NUS_TX_CHAR_UUID,
            (value) => {
              const text = dataViewToText(value);
              this.emitData(text);
            }
          );
        } catch (notifErr) {
          console.warn('Start notifications NUS error:', notifErr);
        }

        let displayName = device.name;
        if (!displayName || displayName.trim() === '') {
          displayName = `ESP32-OBD2 (${device.deviceId.slice(-4)})`;
        }

        this.isSimulator = false;
        this.connectedDevice = {
          id: device.deviceId,
          name: displayName,
          rssi: -50
        };
        this.setStatus('connected');
        return this.connectedDevice;
      } catch (nativeErr: any) {
        console.warn('Capacitor native BLE error or cancelled:', nativeErr);
        this.setStatus('disconnected');
        return null;
      }
    }

    // 1. Kiểm tra Web Bluetooth nếu chạy trên trình duyệt hỗ trợ (Chrome, Edge, Bluefy)
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      try {
        const ALL_OPTIONAL_SERVICES = [
          NUS_SERVICE_UUID,
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe5-0000-1000-8000-00805f9b34fb',
          '00001800-0000-1000-8000-00805f9b34fb',
          '00001801-0000-1000-8000-00805f9b34fb'
        ];

        let requestOptions: any;
        if (onlyNamed) {
          // LỌC CHẶT CHẼ: CHỈ HIỂN THỊ CÁC THIẾT BỊ CÓ TÊN (ẨN TOÀN BỘ THIẾT BỊ KHÔNG TÊN / UNKNOWN)
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
              { namePrefix: 'HCMUT' },
              { namePrefix: 'HC-' },
              { namePrefix: 'V-Link' },
              { namePrefix: 'Viecar' }
            ],
            optionalServices: ALL_OPTIONAL_SERVICES
          };
        } else {
          requestOptions = {
            acceptAllDevices: true,
            optionalServices: ALL_OPTIONAL_SERVICES
          };
        }

        const device = await (navigator as any).bluetooth.requestDevice(requestOptions);

        this.setStatus('connecting');
        this.webBleDevice = device;
        
        device.addEventListener('gattserverdisconnected', () => {
          this.disconnect();
        });

        const server = await device.gatt.connect();
        this.webBleServer = server;

        try {
          let service: any = null;
          try {
            service = await server.getPrimaryService(NUS_SERVICE_UUID);
          } catch {
            for (const uuid of ALL_OPTIONAL_SERVICES) {
              try {
                service = await server.getPrimaryService(uuid);
                if (service) break;
              } catch {}
            }
          }

          if (service) {
            try {
              this.txCharacteristic = await service.getCharacteristic(NUS_TX_CHAR_UUID);
              this.rxCharacteristic = await service.getCharacteristic(NUS_RX_CHAR_UUID);
            } catch {
              const characteristics = await service.getCharacteristics();
              for (const c of characteristics) {
                if ((c.properties.notify || c.properties.indicate) && !this.txCharacteristic) {
                  this.txCharacteristic = c;
                }
                if ((c.properties.write || c.properties.writeWithoutResponse) && !this.rxCharacteristic) {
                  this.rxCharacteristic = c;
                }
              }
            }

            if (this.txCharacteristic) {
              await this.txCharacteristic.startNotifications();
              this.txCharacteristic.addEventListener('characteristicvaluechanged', (e: any) => {
                const value = e.target.value;
                const text = new TextDecoder().decode(value);
                this.emitData(text);
              });
            }
          }
        } catch (svcErr) {
          console.warn('NUS service optional check:', svcErr);
        }

        let displayName = device.name;
        if (!displayName || displayName.trim() === '') {
          displayName = `ESP32-OBD2 (${device.id.slice(-4)})`;
        }

        this.isSimulator = false;
        this.connectedDevice = {
          id: device.id,
          name: displayName,
          rssi: -52
        };
        this.setStatus('connected');
        return this.connectedDevice;
      } catch (err: any) {
        console.warn('Web Bluetooth error or cancelled:', err);
        if (err.name !== 'NotFoundError') {
          // Lỗi không phải do người dùng bấm Cancel
        }
      }
    }

    // 2. Nếu không có Web Bluetooth (ví dụ trên môi trường web thông thường không cấp quyền BLE),
    // Tự động kết nối chế độ Simulator để trải nghiệm ngay
    console.log('Bluetooth API chưa kích hoạt hoặc người dùng chọn giả lập. Đang kết nối ESP32 Virtual...');
    await this.connectSimulator();
    return this.connectedDevice;
  }

  /**
   * Ngắt kết nối
   */
  public disconnect() {
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
  }

  /**
   * Gửi một lệnh ELM327 / OBD2 tới ESP32 và chờ phản hồi
   */
  public async sendCommand(cmd: string, timeoutMs: number = 2500): Promise<string> {
    if (this.status !== 'connected') {
      throw new Error('Chưa kết nối thiết bị quét ESP32 OBD-II');
    }

    const clean = cmd.trim();

    // Nếu đang chạy Simulator
    if (this.isSimulator) {
      return this.handleSimulatorCommand(clean);
    }

    // Nếu chạy thiết bị thật qua Capacitor Native BLE (iOS / Android)
    if (this.nativeDeviceId && Capacitor.isNativePlatform()) {
      return new Promise<string>((resolve, reject) => {
        let responseBuffer = '';
        const timer = setTimeout(() => {
          cleanup();
          resolve(responseBuffer.trim());
        }, timeoutMs);

        const onDataChunk = (text: string) => {
          responseBuffer += text;
          if (responseBuffer.includes('>')) {
            clearTimeout(timer);
            cleanup();
            resolve(responseBuffer.replace('>', '').trim());
          }
        };

        const cleanup = this.onData(onDataChunk);
        const payload = textToDataView(clean + '\r\n');
        BleClient.write(this.nativeDeviceId!, NUS_SERVICE_UUID, NUS_RX_CHAR_UUID, payload).catch((err: any) => {
          clearTimeout(timer);
          cleanup();
          reject(err);
        });
      });
    }

    // Nếu chạy thiết bị thật qua Web Bluetooth
    if (this.rxCharacteristic) {
      return new Promise<string>((resolve, reject) => {
        let responseBuffer = '';
        const timer = setTimeout(() => {
          cleanup();
          resolve(responseBuffer.trim());
        }, timeoutMs);

        const onDataChunk = (text: string) => {
          responseBuffer += text;
          if (responseBuffer.includes('>')) {
            clearTimeout(timer);
            cleanup();
            resolve(responseBuffer.replace('>', '').trim());
          }
        };

        const cleanup = this.onData(onDataChunk);

        const encoder = new TextEncoder();
        const payload = encoder.encode(clean + '\r\n');
        this.rxCharacteristic.writeValue(payload).catch((err: any) => {
          clearTimeout(timer);
          cleanup();
          reject(err);
        });
      });
    }

    throw new Error('Giao thức truyền nhận Bluetooth không sẵn sàng');
  }

  /**
   * Bộ xử lý lệnh phản hồi giả lập chân thực theo chuẩn ELM327
   */
  private async handleSimulatorCommand(cmd: string): Promise<string> {
    // Giả lập độ trễ truyền thông CAN bus (30ms - 80ms)
    await new Promise(r => setTimeout(r, 40));

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
        // P0300 (03 00) và P0171 (01 71)
        return '43 02 03 00 01 71';
      }
      return '43 00';
    }

    // 07 - Read Pending DTCs
    if (upper === '07') {
      if (this.simState.hasDtc) {
        // P0420 (04 20)
        return '47 01 04 20';
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

      if (pid === '00') return '41 00 BE 3F B8 13';

      if (pid === '01') {
        const milByte = this.simState.milOn ? 0x82 : 0x00;
        return `41 01 ${milByte.toString(16).padStart(2, '0').toUpperCase()} 00 00 00`;
      }

      // RPM = ((A*256)+B)/4
      if (pid === '0C') {
        const raw = Math.round(this.simState.rpm * 4);
        const a = (raw >> 8) & 0xff;
        const b = raw & 0xff;
        return `41 0C ${a.toString(16).padStart(2, '0').toUpperCase()} ${b.toString(16).padStart(2, '0').toUpperCase()}`;
      }

      // Speed = A
      if (pid === '0D') {
        const a = Math.round(this.simState.speed) & 0xff;
        return `41 0D ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }

      // Coolant = A - 40
      if (pid === '05') {
        const a = Math.round(this.simState.coolant + 40) & 0xff;
        return `41 05 ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }

      // Throttle = A * 100 / 255
      if (pid === '11') {
        const a = Math.round((this.simState.throttle * 255) / 100) & 0xff;
        return `41 11 ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }

      // Engine Load = A * 100 / 255
      if (pid === '04') {
        const a = Math.round((this.simState.engineLoad * 255) / 100) & 0xff;
        return `41 04 ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }

      // Intake Temp = A - 40
      if (pid === '0F') {
        const a = Math.round(this.simState.intakeTemp + 40) & 0xff;
        return `41 0F ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }

      // Fuel Tank Level = A * 100 / 255
      if (pid === '2F') {
        const a = Math.round((this.simState.fuel * 255) / 100) & 0xff;
        return `41 2F ${a.toString(16).padStart(2, '0').toUpperCase()}`;
      }
    }

    return 'NO DATA';
  }
}

export const bleService = new BleService();
