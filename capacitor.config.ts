import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esp32.obd2scanner',
  appName: 'ESP32 OBD2 Scan Tool',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Đang quét thiết bị chẩn đoán ESP32...",
        cancel: "Hủy",
        availableDevices: "Thiết bị khả dụng",
        noDeviceFound: "Không tìm thấy thiết bị ESP32"
      }
    }
  }
};

export default config;
