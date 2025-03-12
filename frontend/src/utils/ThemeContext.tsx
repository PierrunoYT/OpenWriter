'use client';

import { createContext, useState, useEffect, useContext } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with system as default but don't render anything conditionally
  // This avoids hydration mismatches
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Handle initial client-side setup
  useEffect(() => {
    setMounted(true);
    // On mount, read theme from localStorage or use system default
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  // Handle theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      localStorage.removeItem('theme');
    } else {
      root.classList.add(theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Initial theme setup
  useEffect(() => {
    // Apply theme on initial client-side render
    const root = document.documentElement;
    
    if (root.classList.contains('light') || root.classList.contains('dark')) {
      // Already has a theme class, skip to avoid flicker
      return;
    }
    
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme === 'dark') {
      root.classList.add('dark');
    } else if (storedTheme === 'light') {
      root.classList.add('light');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
