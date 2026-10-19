import React, { useState, useEffect } from 'react';
import { ScreenType, ConnectionStatus } from './types/obd';
import { bleService } from './services/bleService';
import { ObdProtocol } from './services/obdProtocol';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { BluetoothModal } from './components/BluetoothModal';

// Screens
import { HomeScreen } from './screens/HomeScreen';
import { PairingGuideScreen } from './screens/PairingGuideScreen';
import { LiveDataScreen } from './screens/LiveDataScreen';
import { DiagnosticsScreen } from './screens/DiagnosticsScreen';
import { VehicleInfoScreen } from './screens/VehicleInfoScreen';
import { ReportHistoryScreen } from './screens/ReportHistoryScreen';
import { SupportScreen } from './screens/SupportScreen';
import { ObdHubScreen } from './screens/ObdHubScreen';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Lắng nghe thay đổi trạng thái Bluetooth
  useEffect(() => {
    const unsubscribe = bleService.onStatusChange(newStatus => {
      setStatus(newStatus);
      if (newStatus === 'disconnected') {
        ObdProtocol.cachedVehicleInfo = null;
      }
    });
    return unsubscribe;
  }, []);

  const device = bleService.getConnectedDevice();

  // Xác định xem có hiển thị nút Back hay không
  const isSubScreen = ['pairing_guide', 'diagnostics', 'vehicle_info', 'obd_hub'].includes(currentScreen);
  
  // Tiêu đề của màn hình
  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'pairing_guide':
        return '';
      case 'live_data':
        return 'Live Data';
      case 'obd_hub':
        return 'Chẩn đoán OBD-II';
      case 'diagnostics':
        return 'OBD-II Diagnostics';
      case 'vehicle_info':
        return 'Vehicle Information';
      case 'report_history':
        return 'Report History';
      case 'support':
        return 'Help & Support';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Mobile Shell Container */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#F4F6FA] flex flex-col relative shadow-xl border-x border-slate-200/50">
        
        {/* Top Header Bar */}
        <Header
          status={status}
          deviceName={device?.name}
          onOpenConnectModal={() => setShowConnectModal(true)}
          title={getScreenTitle()}
          showBack={isSubScreen}
          onBack={() => setCurrentScreen('home')}
        />

        {/* Screen Routing */}
        <main className="flex-1 flex flex-col">
          {currentScreen === 'home' && (
            <HomeScreen
              status={status}
              onNavigate={setCurrentScreen}
              onOpenConnectModal={() => setShowConnectModal(true)}
            />
          )}

          {currentScreen === 'pairing_guide' && (
            <PairingGuideScreen
              onReadyToPair={() => {
                setShowConnectModal(true);
              }}
              onCancel={() => setCurrentScreen('home')}
              onFindPort={() => setCurrentScreen('support')}
            />
          )}

          {currentScreen === 'live_data' && (
            <LiveDataScreen
              status={status}
              onConnectScanTool={() => setShowConnectModal(true)}
            />
          )}

          {currentScreen === 'obd_hub' && (
            <ObdHubScreen
              status={status}
              onNavigate={setCurrentScreen}
              onBack={() => setCurrentScreen('home')}
            />
          )}

          {currentScreen === 'diagnostics' && (
            <DiagnosticsScreen
              status={status}
              onConnectPrompt={() => setShowConnectModal(true)}
            />
          )}

          {currentScreen === 'vehicle_info' && (
            <VehicleInfoScreen
              status={status}
              onConnectPrompt={() => setShowConnectModal(true)}
            />
          )}

          {currentScreen === 'report_history' && (
            <ReportHistoryScreen />
          )}

          {currentScreen === 'support' && (
            <SupportScreen />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <BottomNav
          currentScreen={currentScreen}
          onSelectScreen={screen => setCurrentScreen(screen)}
        />

        {/* Bluetooth Device Pairing Modal */}
        <BluetoothModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          status={status}
          onConnected={() => {
            setShowConnectModal(false);
          }}
        />
      </div>
    </div>
  );
};

export default App;
