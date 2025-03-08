'use client';

import { useTheme } from '@/app/providers';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // To avoid hydration mismatch, return a placeholder of the same size
  if (!mounted) {
    return (
      <div className="w-[44px] h-[40px] flex items-center justify-center">
        <div className="animate-pulse w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      </div>
    );
  }

  // Visual indicator of the current theme for debugging
  const themeLabel = theme === 'light' ? 'LIGHT MODE' : theme === 'dark' ? 'DARK MODE' : 'SYSTEM';
  
  return (
    <div className="relative inline-flex">
      <button
        onClick={() => {
          const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
          console.log('Changing theme from', theme, 'to', newTheme);
          
          // Immediate update - most reliable way
          document.documentElement.classList.remove('light', 'dark');
          
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
            
            // Add helper attributes for debugging
            document.documentElement.setAttribute('data-mode', 'dark');
            document.documentElement.dataset.theme = 'dark';
            
            // Set localStorage immediately
            localStorage.setItem('theme', 'dark');
          } else if (newTheme === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.style.colorScheme = 'light';
            
            // Add helper attributes for debugging
            document.documentElement.setAttribute('data-mode', 'light');
            document.documentElement.dataset.theme = 'light';
            
            // Set localStorage immediately
            localStorage.setItem('theme', 'light');
          } else if (newTheme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            document.documentElement.classList.add(systemTheme);
            document.documentElement.style.colorScheme = systemTheme;
            
            // Add helper attributes for debugging
            document.documentElement.setAttribute('data-mode', `system-${systemTheme}`);
            document.documentElement.dataset.theme = `system-${systemTheme}`;
            
            // Remove from localStorage for system mode
            localStorage.removeItem('theme');
          }
          
          // Update React state as well
          setTheme(newTheme);
        }}
        className={`p-2 ${theme === 'dark' 
          ? 'text-white bg-slate-700 border border-slate-500 shadow-sm shadow-slate-400/20' 
          : 'text-slate-600'
        } hover:text-blue-400 ${
          theme === 'dark' 
            ? 'hover:bg-slate-600 hover:border-slate-400' 
            : 'hover:bg-slate-100'
        } rounded-full transition-colors`}
        aria-label="Toggle theme"
        title={
          theme === 'light' 
            ? 'Switch to dark mode' 
            : theme === 'dark' 
              ? 'Switch to system theme' 
              : 'Switch to light mode'
        }
      >
        {theme === 'light' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? 'white' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        )}
        {theme === 'dark' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M5 5l1.5 1.5"></path>
            <path d="M17.5 17.5 19 19"></path>
            <path d="M5 19l1.5-1.5"></path>
            <path d="M17.5 6.5 19 5"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
          </svg>
        )}
        {theme === 'system' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? 'white' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        )}
      </button>
    </div>
  );
}