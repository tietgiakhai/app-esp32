# Hướng dẫn Phần cứng & Nạp Firmware ESP32 OBD-II Scan Tool

## 1. Giới thiệu
Firmware này biến board vi điều khiển ESP32 thành một thiết bị chẩn đoán ô tô OBD-II không dây qua chuẩn **Bluetooth Low Energy (BLE)**.
- **Tương thích hoàn toàn với cả iOS (iPhone/iPad) và Android**. 
  *(Lưu ý kỹ thuật: iOS chặn Bluetooth Classic SPP, nhưng hỗ trợ chuẩn BLE Nordic UART Service NUS này 100% không cần chứng chỉ MFi)*.
- Hỗ trợ tập lệnh chuẩn **ELM327 v1.5** và các dịch vụ OBD-II:
  - **Mode 01**: Live Data (Vòng tua RPM, Tốc độ Speed, Nhiệt độ nước làm mát Coolant, Bướm ga Throttle, Tải động cơ Load,...)
  - **Mode 03**: Đọc mã lỗi đã lưu (Read DTCs)
  - **Mode 07**: Đọc mã lỗi tạm thời (Pending DTCs)
  - **Mode 04**: Xóa mã lỗi và tắt đèn Check Engine (Erase DTCs / Clear Codes)
  - **Mode 09 PID 02**: Đọc số khung xe VIN (17 ký tự)
- Tích hợp sẵn **Auto Simulator**: Nếu bạn cắm ESP32 vào máy tính để lập trình hoặc cấp nguồn sạc dự phòng trên bàn mà chưa cắm vào cổng OBD-II của ô tô, firmware sẽ tự động kích hoạt bộ giả lập sinh dữ liệu RPM dao động, tốc độ và mã lỗi mẫu để app điện thoại kết nối và hiển thị đồng hồ nhảy số ngay lập tức!

---

## 2. Sơ đồ Đấu nối Phần cứng (Hardware Wiring)

### Linh kiện cần chuẩn bị:
1. **Module ESP32**: ESP32-WROOM-32 (NodeMCU-32S / ESP32 DevKitC v4).
2. **Module Thu phát CAN Bus**: Module **SN65HVD230** (hoặc VP230, TJA1050 có chuyển mức 3.3V).
   *Khuyên dùng module SN65HVD230 vì nó chạy trực tiếp điện áp 3.3V rất an toàn cho chân GPIO của ESP32.*
3. **Cáp / Đầu cắm OBD-II đực (Male 16-pin connector)**.
4. **Mạch giảm áp Step-down (Buck converter)**: Hạ áp từ 12V trên cổng OBD xe xuống 5V để nuôi ESP32 qua chân VIN.

### Bảng đấu dây chi tiết:

| Module CAN (SN65HVD230) | Board ESP32 | Chú thích |
|---|---|---|
| 3V3 / VCC | 3V3 | Nguồn 3.3V |
| GND | GND | Nối chung mass |
| CRX (CAN RX) | **GPIO 4** | Chân nhận dữ liệu TWAI RX |
| CTX (CAN TX) | **GPIO 5** | Chân truyền dữ liệu TWAI TX |

| Module CAN (SN65HVD230) | Cổng OBD-II trên Xe (16 Chân) | Ý nghĩa |
|---|---|---|
| **CAN_H** | **Chân số 6 (Pin 6)** | Đường truyền CAN High |
| **CAN_L** | **Chân số 14 (Pin 14)** | Đường truyền CAN Low |
| GND | **Chân số 4 hoặc 5 (Pin 4/5)** | Mass sườn xe / Mass tín hiệu |

### Cấp nguồn từ cổng OBD-II của ô tô:
- **Chân số 16** trên cổng OBD-II ô tô luôn có điện áp ắc quy **+12V**.
- Nối Chân 16 OBD-II -> Đầu vào **IN+** của mạch giảm áp (Buck converter hạ xuống 5V).
- Nối Chân 4/5 OBD-II -> Đầu vào **IN-** của mạch giảm áp.
- Đầu ra **OUT+ (5V)** của mạch giảm áp -> Chân **VIN (hoặc 5V)** của ESP32.
- Đầu ra **OUT- (GND)** của mạch giảm áp -> Chân **GND** của ESP32.

---

## 3. Hướng dẫn Nạp Code qua Arduino IDE

1. **Cài đặt Arduino IDE** (hoặc VS Code với PlatformIO).
2. Thêm ESP32 board package:
   - Vào `File` -> `Preferences`.
   - Tại mục *Additional Boards Manager URLs*, dán:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Vào `Tools` -> `Board` -> `Boards Manager`, tìm kiếm `esp32` và bấm **Install**.
3. Mở file `esp32_obd_ble.ino`.
4. Chọn loại board: `Tools` -> `Board` -> `esp32` -> `ESP32 Dev Module` (hoặc `DOIT ESP32 DEVKIT V1`).
5. Cắm ESP32 vào cổng USB máy tính, chọn đúng cổng COM tại `Tools` -> `Port`.
6. Bấm nút **Upload** (Mũi tên sang phải).
7. Mở `Tools` -> `Serial Monitor` với tốc độ **115200 baud** để xem thông báo khởi động và dữ liệu truyền nhận.
