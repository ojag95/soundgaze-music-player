import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PlayerBar from '../components/PlayerBar';
import SettingsModal from '../components/SettingsModal';
import CommandPalette from '../components/CommandPalette';
import { useUIStore } from '../store/uiStore';
import { usePluginStore } from '../store/pluginStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import OnboardingModal from '../components/Settings/OnboardingModal';
import { useTranslation } from 'react-i18next';

const LargeArtOverlay = React.lazy(() => import("../plugins/LargeArt/LargeArtOverlay"));
const TagEditorModal = React.lazy(() => import("../plugins/TagEditor/TagEditorModal"));

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isLargeArtOpen, openCommandPalette, tagEditorTrackPath, closeTagEditor } = useUIStore();
  const { isPluginActive } = usePluginStore();
  const { t } = useTranslation();

  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none relative bg-background text-content">
      
      <header className="md:hidden h-14 bg-surface border-b border-divider flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center">
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="text-muted hover:text-content transition-colors p-1"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold tracking-wider text-muted text-sm">
            SOUNDGAZE
          </span>
        </div>

        <button
          onClick={openCommandPalette}
          className="p-2 text-muted hover:text-brand-primary transition-colors rounded-lg bg-background/50 border border-divider"
          title={t("commandPalette.searchTitle", "Buscar (Ctrl+K o /)")}
        >
          <Search size={18} />
        </button>
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
        
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <PlayerBar />
      <SettingsModal />
      <CommandPalette />
      <OnboardingModal />
      {isPluginActive("large-art") && isLargeArtOpen && (
        <Suspense fallback={null}>
          <LargeArtOverlay />
        </Suspense>
      )}
      {isPluginActive("tag-editor") && tagEditorTrackPath && (
        <Suspense fallback={null}>
          <TagEditorModal
            trackPath={tagEditorTrackPath}
            onClose={closeTagEditor}
          />
        </Suspense>
      )}
    </div>
  );
}