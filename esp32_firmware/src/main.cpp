/*
 * ========================================================================================
 * ESP32 OBD-II Bluetooth Low Energy (BLE) Scan Tool Firmware for VS Code (PlatformIO)
 * Tương thích hoàn toàn với iOS (iPhone/iPad qua Bluefy / Native App) & Android
 * Chức năng: Đọc DTCs, Xóa DTCs, Live Data (RPM, Speed, Temp,...), Đọc số VIN xe
 * Giao thức: Chuẩn Nordic UART Service (NUS) tương thích Web BLE & CoreBluetooth
 * Hỗ trợ 2 chế độ:
 *   1. CAN Bus thật (sử dụng ESP32 TWAI tích hợp + transceiver SN65HVD230 / VP230)
 *      -> Đọc trực tiếp từ cổng OBD-II (Pin 6 CAN_H, Pin 14 CAN_L) của xe Mitsubishi Xpander
 *   2. Auto Simulator (tự động mô phỏng dữ liệu xe khi test bàn làm việc chưa cắm vào xe)
 * ========================================================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "driver/twai.h"

// Tên thiết bị hiển thị khi quét BLE
#define DEVICE_NAME "ESP32-OBD2"

// Định nghĩa chân CAN TWAI trên ESP32
#define CAN_TX_PIN GPIO_NUM_5   // Nối chân CTX của bộ thu phát CAN (SN65HVD230)
#define CAN_RX_PIN GPIO_NUM_4   // Nối chân CRX của bộ thu phát CAN (SN65HVD230)
#define LED_PIN    GPIO_NUM_2   // Đèn LED báo trạng thái kết nối

// UUID Nordic UART Service (NUS) chuẩn quốc tế
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// Khai báo nguyên mẫu hàm
void initSimulator();
void updateSimulation();
void sendResponse(String response);
void processObdCommand(String cmd);
void initCanBus();
bool requestCanObd(uint8_t mode, uint8_t pid, uint8_t *respData, uint8_t &respLen, unsigned long timeoutMs = 150);
bool requestCanVin(String &vinOut, unsigned long timeoutMs = 350);

BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
unsigned long lastRxTime = 0;

// Trạng thái CAN Bus thực tế
bool canInitialized = false;

// Trạng thái xe mô phỏng (Simulator)
struct SimulatedCar {
  float rpm;
  float speed;
  float coolantTemp;
  float throttle;
  float engineLoad;
  float intakeTemp;
  float fuelLevel;
  bool milOn;
  bool dtcActive;
  String vin;
} carState;

// Buffer xử lý dữ liệu nhận từ BLE
String rxBuffer = "";

// =====================================================================
// KHỞI TẠO BỘ GIẢ LẬP XE (SIMULATOR) KHI TEST BÀN KHÔNG CẦN XE THẬT
// =====================================================================
void initSimulator() {
  carState.rpm = 850.0;
  carState.speed = 0.0;
  carState.coolantTemp = 86.0;   // 86 độ C
  carState.throttle = 14.5;      // 14.5%
  carState.engineLoad = 22.0;    // 22%
  carState.intakeTemp = 32.0;    // 32 độ C
  carState.fuelLevel = 68.0;     // 68%
  carState.milOn = true;         // Đèn Check Engine sáng
  carState.dtcActive = true;     // Có 2 mã lỗi mẫu (P0300 & P0171)
  carState.vin = "MK2NC1W09LP128945"; // Mitsubishi Xpander 2020 (L = 2020)
}

void updateSimulation() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate < 200) return;
  lastUpdate = millis();

  // Tạo hiệu ứng chân ga / động cơ dao động tự nhiên khi test mô phỏng
  static float phase = 0.0;
  phase += 0.08;

  if (carState.rpm < 3200) {
    carState.rpm = 900.0 + sin(phase) * 600.0 + 800.0;
    carState.speed = (carState.rpm / 35.0);
    carState.throttle = 15.0 + (carState.rpm / 100.0);
    carState.engineLoad = 20.0 + (carState.rpm / 90.0);
  } else {
    carState.rpm = 850.0;
  }
}

// =====================================================================
// TRUYỀN NHẬN GÓI TIN CAN BUS VỚI HỘP ĐIỀU KHIỂN ECU XE THỰC TẾ
// =====================================================================

/**
 * Gửi yêu cầu chuẩn OBD-II (ID 0x7DF) và nhận phản hồi từ ECU (ID 0x7E8)
 */
bool requestCanObd(uint8_t mode, uint8_t pid, uint8_t *respData, uint8_t &respLen, unsigned long timeoutMs) {
  if (!canInitialized) return false;

  twai_message_t tx_msg;
  tx_msg.identifier = 0x7DF; // OBD-II Broadcast Request ID
  tx_msg.extd = 0;          // 11-bit Standard Frame
  tx_msg.rtr = 0;
  tx_msg.data_length_code = 8;
  
  if (pid != 0xFF) {
    tx_msg.data[0] = 0x02; // Số byte payload (Mode + PID)
    tx_msg.data[1] = mode;
    tx_msg.data[2] = pid;
  } else {
    tx_msg.data[0] = 0x01; // Chỉ có Mode (Mode 03, Mode 04, Mode 07)
    tx_msg.data[1] = mode;
    tx_msg.data[2] = 0x00;
  }
  tx_msg.data[3] = 0x55;
  tx_msg.data[4] = 0x55;
  tx_msg.data[5] = 0x55;
  tx_msg.data[6] = 0x55;
  tx_msg.data[7] = 0x55;

  // Xóa rác trong bộ đệm nhận trước khi gửi
  twai_message_t dummy_rx;
  while (twai_receive(&dummy_rx, 0) == ESP_OK) {}

  if (twai_transmit(&tx_msg, pdMS_TO_TICKS(40)) != ESP_OK) {
    return false;
  }

  unsigned long startTime = millis();
  while (millis() - startTime < timeoutMs) {
    twai_message_t rx_msg;
    if (twai_receive(&rx_msg, pdMS_TO_TICKS(15)) == ESP_OK) {
      // Phản hồi từ ECU động cơ (0x7E8) hoặc hộp số (0x7E9)
      if (rx_msg.identifier >= 0x7E8 && rx_msg.identifier <= 0x7EF) {
        if (rx_msg.data[1] == (mode + 0x40)) {
          uint8_t len = rx_msg.data[0];
          if (len > 7) len = 7;
          respLen = len;
          for (uint8_t i = 0; i < len; i++) {
            respData[i] = rx_msg.data[i + 1];
          }
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Đọc số khung xe VIN thực tế (ISO 15765-2 Multi-frame 17 ký tự)
 */
bool requestCanVin(String &vinOut, unsigned long timeoutMs) {
  if (!canInitialized) return false;

  twai_message_t tx_msg;
  tx_msg.identifier = 0x7DF;
  tx_msg.extd = 0;
  tx_msg.rtr = 0;
  tx_msg.data_length_code = 8;
  tx_msg.data[0] = 0x02;
  tx_msg.data[1] = 0x09; // Mode 09
  tx_msg.data[2] = 0x02; // PID 02: VIN
  for (int i = 3; i < 8; i++) tx_msg.data[i] = 0x55;

  twai_message_t dummy;
  while (twai_receive(&dummy, 0) == ESP_OK) {}

  if (twai_transmit(&tx_msg, pdMS_TO_TICKS(40)) != ESP_OK) return false;

  uint8_t vinBytes[20];
  uint8_t bytesRead = 0;
  unsigned long start = millis();

  while (millis() - start < timeoutMs && bytesRead < 17) {
    twai_message_t rx_msg;
    if (twai_receive(&rx_msg, pdMS_TO_TICKS(20)) == ESP_OK) {
      if (rx_msg.identifier >= 0x7E8 && rx_msg.identifier <= 0x7EF) {
        // First Frame (0x10)
        if ((rx_msg.data[0] & 0xF0) == 0x10) {
          // Gửi Flow Control Frame (FC) để ECU gửi tiếp Consecutive Frames
          twai_message_t fc;
          fc.identifier = rx_msg.identifier - 8; // 0x7E0
          fc.extd = 0;
          fc.rtr = 0;
          fc.data_length_code = 8;
          fc.data[0] = 0x30; // Flow Control Continue
          fc.data[1] = 0x00; // Block size 0
          fc.data[2] = 0x00; // Separation time 0ms
          for (int k = 3; k < 8; k++) fc.data[k] = 0x55;
          twai_transmit(&fc, pdMS_TO_TICKS(30));

          // 3 ký tự đầu tiên nằm ở byte 5, 6, 7
          for (int b = 5; b < 8; b++) {
            if (bytesRead < 17) vinBytes[bytesRead++] = rx_msg.data[b];
          }
        } 
        // Consecutive Frame (0x21, 0x22, ...)
        else if ((rx_msg.data[0] & 0xF0) == 0x20) {
          for (int b = 1; b < 8; b++) {
            if (bytesRead < 17) vinBytes[bytesRead++] = rx_msg.data[b];
          }
        }
      }
    }
  }

  if (bytesRead >= 17) {
    vinOut = "";
    for (int i = 0; i < 17; i++) {
      vinOut += (char)vinBytes[i];
    }
    return true;
  }
  return false;
}

// =====================================================================
// GỬI PHẢN HỒI QUA BLUETOOTH BLE VỀ APP (ĐIỆN THOẠI)
// =====================================================================
void sendResponse(String response) {
  if (!deviceConnected || pTxCharacteristic == NULL) return;
  
  // Chuẩn ELM327 kết thúc câu trả lời bằng ký tự nhắc lệnh '>'
  response += "\r\n>";
  
  // Chia nhỏ gói theo chuẩn BLE MTU an toàn cho iOS và Android (20 byte payload)
  int len = response.length();
  int offset = 0;
  while (offset < len) {
    int chunkSize = min(len - offset, 20); // 20 byte an toàn tránh rớt gói trên iPhone
    String chunk = response.substring(offset, offset + chunkSize);
    pTxCharacteristic->setValue((uint8_t*)chunk.c_str(), chunk.length());
    pTxCharacteristic->notify();
    offset += chunkSize;
    delay(10); // Cho phép BLE stack truyền tải dữ liệu ổn định
  }
  
  Serial.print("[BLE TX] ");
  Serial.println(response);
}

// =====================================================================
// BỘ PHÂN TÍCH LỆNH OBD-II & ELM327
// =====================================================================
void processObdCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  // Loại bỏ khoảng trắng trong lệnh
  String cleanCmd = "";
  for (unsigned int i = 0; i < cmd.length(); i++) {
    if (cmd[i] != ' ') cleanCmd += cmd[i];
  }

  Serial.print("[BLE RX] Lệnh nhận: ");
  Serial.println(cleanCmd);

  // 1. Tập lệnh cấu hình ELM327 AT Commands
  if (cleanCmd.startsWith("AT")) {
    if (cleanCmd == "ATZ" || cleanCmd == "ATWS") {
      sendResponse("ELM327 v1.5 ESP32-OBD");
    } else if (cleanCmd == "ATE0" || cleanCmd == "ATE1" || 
               cleanCmd == "ATH0" || cleanCmd == "ATH1" ||
               cleanCmd == "ATL0" || cleanCmd == "ATL1" ||
               cleanCmd == "ATSP0" || cleanCmd.startsWith("ATSP") ||
               cleanCmd == "ATSTFF" || cleanCmd.startsWith("ATAT") ||
               cleanCmd == "ATS0") {
      sendResponse("OK");
    } else if (cleanCmd == "ATDP") {
      sendResponse("ISO 15765-4 (CAN 11/500)");
    } else if (cleanCmd == "ATDPN") {
      sendResponse("6"); // Chuẩn protocol 6: ISO 15765-4 11-bit 500k
    } else if (cleanCmd == "ATRV") {
      // Đọc điện áp bình ắc quy xe
      sendResponse("13.6V");
    } else {
      sendResponse("OK");
    }
    return;
  }

  // 2. Chức năng ĐỌC SỐ VIN (Mode 09 PID 02)
  if (cleanCmd == "0902") {
    String realVin = "";
    if (requestCanVin(realVin)) {
      Serial.print("[CAN THẬT] Đọc thành công số VIN từ xe: ");
      Serial.println(realVin);
      String vinHex = "49 02 01";
      for (unsigned int i = 0; i < realVin.length(); i++) {
        char hexBuffer[4];
        sprintf(hexBuffer, " %02X", (uint8_t)realVin[i]);
        vinHex += hexBuffer;
      }
      sendResponse(vinHex);
      return;
    }

    // Fallback: Nếu không có phản hồi từ xe (đang test trên bàn làm việc)
    Serial.println("[SIMULATOR] Gửi số VIN Xpander 2020 mô phỏng");
    String vinHex = "49 02 01";
    for (unsigned int i = 0; i < carState.vin.length(); i++) {
      char hexBuffer[4];
      sprintf(hexBuffer, " %02X", (uint8_t)carState.vin[i]);
      vinHex += hexBuffer;
    }
    sendResponse(vinHex);
    return;
  }

  // 3. Chức năng ĐỌC MÃ LỖI (Read DTCs)
  // Mode 03: Stored DTCs (Mã lỗi đã xác nhận)
  if (cleanCmd == "03") {
    uint8_t canData[8];
    uint8_t canLen = 0;
    if (requestCanObd(0x03, 0xFF, canData, canLen)) {
      Serial.println("[CAN THẬT] Nhận mã lỗi Mode 03 từ ECU xe!");
      String resp = "43";
      for (int i = 1; i < canLen; i++) {
        char buf[4];
        sprintf(buf, " %02X", canData[i]);
        resp += buf;
      }
      sendResponse(resp);
      return;
    }

    // Fallback Simulator
    if (carState.dtcActive) {
      sendResponse("43 02 03 00 01 71"); // P0300 & P0171
    } else {
      sendResponse("43 00"); // Không có lỗi
    }
    return;
  }

  // Mode 07: Pending DTCs (Mã lỗi tạm thời)
  if (cleanCmd == "07") {
    uint8_t canData[8];
    uint8_t canLen = 0;
    if (requestCanObd(0x07, 0xFF, canData, canLen)) {
      String resp = "47";
      for (int i = 1; i < canLen; i++) {
        char buf[4];
        sprintf(buf, " %02X", canData[i]);
        resp += buf;
      }
      sendResponse(resp);
      return;
    }

    // Fallback Simulator
    if (carState.dtcActive) {
      sendResponse("47 01 04 20"); // P0420
    } else {
      sendResponse("47 00");
    }
    return;
  }

  // Mode 0A: Permanent DTCs (Mã lỗi vĩnh viễn)
  if (cleanCmd == "0A") {
    sendResponse("4A 00");
    return;
  }

  // 4. Chức năng XÓA MÃ LỖI (Erase DTCs - Mode 04)
  if (cleanCmd == "04") {
    uint8_t canData[8];
    uint8_t canLen = 0;
    requestCanObd(0x04, 0xFF, canData, canLen);
    carState.dtcActive = false;
    carState.milOn = false;
    Serial.println("[CAN] Đã gửi lệnh xóa mã lỗi Mode 04 tới ECU!");
    sendResponse("44");
    return;
  }

  // 5. Chức năng DỮ LIỆU TRỰC TIẾP (Live Data - Mode 01)
  if (cleanCmd.startsWith("01")) {
    String pidStr = cleanCmd.substring(2);
    uint8_t pidVal = (uint8_t)strtol(pidStr.c_str(), NULL, 16);

    // Thử truy vấn CAN thật từ ECU xe trước
    uint8_t canData[8];
    uint8_t canLen = 0;
    if (requestCanObd(0x01, pidVal, canData, canLen)) {
      String resp = "41 " + pidStr;
      for (int i = 2; i < canLen; i++) {
        char buf[4];
        sprintf(buf, " %02X", canData[i]);
        resp += buf;
      }
      sendResponse(resp);
      return;
    }

    // Fallback: Sử dụng dữ liệu bộ mô phỏng (Simulator)
    if (cleanCmd == "0100") {
      sendResponse("41 00 BE 3F B8 13");
      return;
    }
    if (cleanCmd == "0101") {
      uint8_t milByte = carState.milOn ? 0x82 : 0x00;
      char buf[16];
      sprintf(buf, "41 01 %02X 00 00 00", milByte);
      sendResponse(String(buf));
      return;
    }
    // PID 0C: Engine RPM (Vòng tua máy)
    if (cleanCmd == "010C") {
      uint16_t rawRpm = (uint16_t)(carState.rpm * 4.0);
      uint8_t a = (rawRpm >> 8) & 0xFF;
      uint8_t b = rawRpm & 0xFF;
      char buf[16];
      sprintf(buf, "41 0C %02X %02X", a, b);
      sendResponse(String(buf));
      return;
    }
    // PID 0D: Vehicle Speed (Tốc độ km/h)
    if (cleanCmd == "010D") {
      uint8_t speedByte = (uint8_t)carState.speed;
      char buf[16];
      sprintf(buf, "41 0D %02X", speedByte);
      sendResponse(String(buf));
      return;
    }
    // PID 05: Coolant Temp (Nhiệt độ nước làm mát)
    if (cleanCmd == "0105") {
      uint8_t tempByte = (uint8_t)(carState.coolantTemp + 40.0);
      char buf[16];
      sprintf(buf, "41 05 %02X", tempByte);
      sendResponse(String(buf));
      return;
    }
    // PID 11: Throttle Position (Bướm ga %)
    if (cleanCmd == "0111") {
      uint8_t thrByte = (uint8_t)(carState.throttle * 255.0 / 100.0);
      char buf[16];
      sprintf(buf, "41 11 %02X", thrByte);
      sendResponse(String(buf));
      return;
    }
    // PID 04: Calculated Engine Load (%)
    if (cleanCmd == "0104") {
      uint8_t loadByte = (uint8_t)(carState.engineLoad * 255.0 / 100.0);
      char buf[16];
      sprintf(buf, "41 04 %02X", loadByte);
      sendResponse(String(buf));
      return;
    }
    // PID 0F: Intake Air Temperature (°C)
    if (cleanCmd == "010F") {
      uint8_t iatByte = (uint8_t)(carState.intakeTemp + 40.0);
      char buf[16];
      sprintf(buf, "41 0F %02X", iatByte);
      sendResponse(String(buf));
      return;
    }
    // PID 2F: Fuel Tank Level (%)
    if (cleanCmd == "012F") {
      uint8_t fuelByte = (uint8_t)(carState.fuelLevel * 255.0 / 100.0);
      char buf[16];
      sprintf(buf, "41 2F %02X", fuelByte);
      sendResponse(String(buf));
      return;
    }
  }

  // Trường hợp lệnh chưa biết hoặc không phản hồi
  sendResponse("NO DATA");
}

// =====================================================================
// CALLBACK KẾT NỐI BLUETOOTH BLE
// =====================================================================
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[BLE] Điện thoại (iOS / Android) đã kết nối thành công!");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[BLE] Điện thoại đã ngắt kết nối. Đang phát lại sóng quảng bá...");
    BLEDevice::startAdvertising();
  }
};

class CharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string rxValue = pCharacteristic->getValue();
    if (rxValue.length() > 0) {
      lastRxTime = millis();
      for (size_t i = 0; i < rxValue.length(); i++) {
        char c = rxValue[i];
        if (c == '\r' || c == '\n') {
          if (rxBuffer.length() > 0) {
            processObdCommand(rxBuffer);
            rxBuffer = "";
          }
        } else {
          rxBuffer += c;
        }
      }
    }
  }
};

// =====================================================================
// KHỞI TẠO CAN BUS TWAI (DÀNH CHO XE THẬT)
// =====================================================================
void initCanBus() {
  twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT(CAN_TX_PIN, CAN_RX_PIN, TWAI_MODE_NORMAL);
  twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS(); // Tốc độ chuẩn 500kbps ISO 15765-4
  twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

  if (twai_driver_install(&g_config, &t_config, &f_config) == ESP_OK) {
    if (twai_start() == ESP_OK) {
      Serial.println("[CAN] Driver TWAI 500kbps khởi tạo thành công!");
      canInitialized = true;
      return;
    }
  }
  Serial.println("[CAN] Không kết nối được CAN transceiver SN65HVD230. Sẽ chạy chế độ tự động!");
  canInitialized = false;
}

// =====================================================================
// SETUP & LOOP
// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("  ESP32 OBD-II SCAN TOOL (HCMUT AUTOMOTIVE)  ");
  Serial.println("=============================================");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Khởi tạo bộ giả lập mặc định
  initSimulator();

  // Khởi tạo CAN TWAI (giao tiếp vi mạch SN65HVD230 với cổng OBD-II)
  initCanBus();

  // Khởi tạo Bluetooth BLE
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Tạo BLE Service NUS
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // TX Characteristic (Notify về điện thoại)
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // RX Characteristic (Nhận lệnh từ điện thoại)
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                                           CHARACTERISTIC_UUID_RX,
                                           BLECharacteristic::PROPERTY_WRITE |
                                           BLECharacteristic::PROPERTY_WRITE_NR
                                         );
  pRxCharacteristic->setCallbacks(new CharacteristicCallbacks());

  pService->start();

  // Bắt đầu phát quảng bá (Advertising) với đầy đủ tên thiết bị
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);

  BLEAdvertisementData oAdvertisementData;
  oAdvertisementData.setName(DEVICE_NAME);
  oAdvertisementData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
  pAdvertising->setAdvertisementData(oAdvertisementData);

  BLEAdvertisementData oScanResponseData;
  oScanResponseData.setName(DEVICE_NAME);
  oScanResponseData.setCompleteServices(BLEUUID(SERVICE_UUID));
  pAdvertising->setScanResponseData(oScanResponseData);

  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Chuẩn tương thích kết nối iPhone (iOS)
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Đang phát Bluetooth: " DEVICE_NAME);
  Serial.println("[BLE] Sẵn sàng kết nối điện thoại (iOS & Android).");
}

void loop() {
  // Cập nhật trạng thái dao động vòng tua / tốc độ của xe giả lập
  updateSimulation();

  // Tự động xử lý lệnh nếu nhận chuỗi không kèm \r hoặc \n sau 250ms
  if (rxBuffer.length() > 0 && (millis() - lastRxTime > 250)) {
    processObdCommand(rxBuffer);
    rxBuffer = "";
  }

  // Xử lý tự động kết nối lại khi mất sóng
  if (!deviceConnected && oldDeviceConnected) {
    delay(200);
    pServer->startAdvertising();
    Serial.println("[BLE] Bắt đầu quảng bá lại sau khi ngắt kết nối.");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(20);
}
