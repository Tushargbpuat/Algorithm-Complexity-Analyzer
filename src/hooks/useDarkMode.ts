import { useEffect, useState } from 'react';

const STORAGE_KEY = 'acv-theme';

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY, 'light');
    }
  }, [dark]);

  const toggle = () => setDark((d) => !d);
  return [dark, toggle];
}
