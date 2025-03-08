'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function ThemeScript() {
  // This component only handles the initial theme setup
  // Using useEffect to run only on the client side
  useEffect(() => {
    // On mount, check localStorage and system preference
    const storedTheme = localStorage.getItem('theme');
    const root = document.documentElement;
    
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
  
  return null;
}