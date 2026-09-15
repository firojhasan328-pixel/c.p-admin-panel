import { useEffect, useState } from 'react';

// ============================================
// 🎨 useDarkMode Hook — অটো ডিভাইস সেটিং ফলো
// ============================================

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyDarkMode = (matches) => {
      setIsDark(matches);

      if (matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#f1f5f9';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.style.backgroundColor = '#f1f5f9';
        document.body.style.color = '#0f172a';
      }
    };

    applyDarkMode(mediaQuery.matches);

    const handleChange = (e) => {
      applyDarkMode(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return isDark;
}
