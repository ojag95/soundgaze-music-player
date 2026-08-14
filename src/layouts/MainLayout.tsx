import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PlayerBar from '../components/PlayerBar';
import SettingsModal from '../components/SettingsModal';
import { useUIStore } from '../store/uiStore';
import { usePluginStore } from '../store/pluginStore';
import OnboardingModal from '../components/Settings/OnboardingModal';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const LargeArtOverlay = React.lazy(() => import("../plugins/LargeArt/LargeArtOverlay"));
  const { isLargeArtOpen } = useUIStore();
  const { isPluginActive } = usePluginStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none relative bg-background text-content">
      
      <header className="md:hidden h-14 bg-surface border-b border-divider flex items-center px-4 shrink-0 z-40">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-muted hover:text-content transition-colors p-1"
        >
          <Menu size={24} />
        </button>
        <span className="ml-4 font-bold tracking-wider text-muted text-sm">
          SOUNDGAZE
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <Sidebar 
          isMobileOpen={isMobileMenuOpen} 
          closeMobile={() => setIsMobileMenuOpen(false)} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
          <Outlet />
        </main>
      </div>

      <PlayerBar />
      <SettingsModal />
      <OnboardingModal />
      {isPluginActive("large-art") && isLargeArtOpen && (
        <Suspense fallback={null}>
          <LargeArtOverlay />
        </Suspense>
      )}
    </div>
  );
}