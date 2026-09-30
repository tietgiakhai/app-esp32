import React from 'react';
import { Home, FileClock, LineChart, HelpCircle } from 'lucide-react';
import { ScreenType } from '../types/obd';

interface BottomNavProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onSelectScreen }) => {
  const tabs = [
    {
      id: 'home' as ScreenType,
      label: 'Home',
      icon: Home
    },
    {
      id: 'report_history' as ScreenType,
      label: 'Report History',
      icon: FileClock
    },
    {
      id: 'live_data' as ScreenType,
      label: 'Live Data',
      icon: LineChart
    },
    {
      id: 'support' as ScreenType,
      label: 'Support',
      icon: HelpCircle
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-2 py-1.5 shadow-lg safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectScreen(tab.id)}
              className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 stroke-[1.8] ${isActive ? 'stroke-blue-600' : 'stroke-slate-500'}`} />
              </div>
              <span className={`text-[11px] mt-1 font-medium tracking-tight ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
