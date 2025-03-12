import { useTheme } from '../utils/ThemeContext';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleTheme = () => {
    setIsAnimating(true);
    
    // Cycle through themes: light -> dark -> system -> light
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
    
    // Reset animation after it completes
    setTimeout(() => setIsAnimating(false), 700);
  };

  // Theme label for tooltip
  const themeLabel = {
    'light': 'Light Mode',
    'dark': 'Dark Mode',
    'system': 'System Theme (Auto)'
  }[theme];

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg transition-colors duration-300 
        ${isAnimating ? 'animate-pulse' : ''} 
        ${theme === 'dark' 
          ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
          : theme === 'light' 
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            : 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 hover:from-blue-200 hover:to-indigo-200 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-slate-700 dark:text-slate-200'
        }`}
      title={`${themeLabel}${theme === 'system' ? ' - Follows your device settings' : ''} - Click to change`}
      aria-label={`Current theme: ${themeLabel}. Click to toggle.`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Dark mode icon - Moon */}
        <div className={`absolute inset-0 transition-all duration-300 transform
          ${theme === 'dark' 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-50 rotate-90'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </div>
        
        {/* Light mode icon - Sun */}
        <div className={`absolute inset-0 transition-all duration-300 transform
          ${theme === 'light' 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-50 rotate-90'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </div>
        
        {/* System mode icon - Auto */}
        <div className={`absolute inset-0 transition-all duration-300 transform
          ${theme === 'system' 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-50 rotate-90'}`}>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-blue-400 dark:bg-blue-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
