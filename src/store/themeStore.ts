import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export interface CustomColors {
  brandPrimary: string;
  background: string;
  surface: string;
  surfaceHover: string;
  textContent: string;
  textMuted: string;
  borderSubtle: string;
}

const defaultColors: { light: CustomColors; dark: CustomColors } = {
  light: {
    brandPrimary: '#01A8A8',
    background: '#EBEFF4',
    surface: '#E3E7EF',
    surfaceHover: '#D5DCE6',
    textContent: '#1E2532',
    textMuted: '#64748B',
    borderSubtle: '#CBD5E1',
  },
  dark: {
    brandPrimary: '#01A8A8',
    background: '#323742',
    surface: '#3E4452',
    surfaceHover: '#4A5162',
    textContent: '#F8FAFC',
    textMuted: '#94A3B8',
    borderSubtle: '#4A5162',
  },
};

interface ThemeState {
  isDark: boolean;
  lightPalette: CustomColors;
  darkPalette: CustomColors;
  
  setBaseTheme: (theme: 'light' | 'dark') => void;
  updateCustomColor: (theme: 'light' | 'dark', key: keyof CustomColors, color: string) => void;
  resetToDefaults: (theme: 'light' | 'dark') => void;
  _applyTheme: () => void;
  applyScheme: (lightColors: CustomColors, darkColors: CustomColors) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      lightPalette: { ...defaultColors.light },
      darkPalette: { ...defaultColors.dark },

      setBaseTheme: (theme) => {
        const isDark = theme === 'dark';
        set({ isDark });
        get()._applyTheme();
      },

      updateCustomColor: (theme, key, color) => {
        if (theme === 'dark') {
          set((state) => ({ darkPalette: { ...state.darkPalette, [key]: color } }));
        } else {
          set((state) => ({ lightPalette: { ...state.lightPalette, [key]: color } }));
        }
        get()._applyTheme();
      },

      resetToDefaults: (theme) => {
        if (theme === 'dark') {
          set({ darkPalette: { ...defaultColors.dark } });
        } else {
          set({ lightPalette: { ...defaultColors.light } });
        }
        get()._applyTheme();
      },

      _applyTheme: () => {
        const { isDark, lightPalette, darkPalette } = get();
        const root = document.documentElement;
        const currentPalette = isDark ? darkPalette : lightPalette;

        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        root.style.setProperty('--color-brand-primary', currentPalette.brandPrimary);
        root.style.setProperty('--bg-base', currentPalette.background);
        root.style.setProperty('--bg-surface', currentPalette.surface);
        root.style.setProperty('--bg-surface-hover', currentPalette.surfaceHover);
        root.style.setProperty('--text-base', currentPalette.textContent);
        root.style.setProperty('--text-muted', currentPalette.textMuted);
        root.style.setProperty('--border-subtle', currentPalette.borderSubtle);
      },
      
      applyScheme: (lightColors, darkColors) => {
        set({
          lightPalette: { ...lightColors },
          darkPalette: { ...darkColors }
        });
        get()._applyTheme();
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        isDark: state.isDark,
        lightPalette: state.lightPalette,
        darkPalette: state.darkPalette,
      }),
      onRehydrateStorage: () => (state) => {
        state?._applyTheme();
      },
    }
  )
);