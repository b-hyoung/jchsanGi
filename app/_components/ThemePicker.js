'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_THEME_ID, THEME_OPTIONS } from '@/lib/themeCatalog';

export const themes = THEME_OPTIONS;

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
};

function getInitialTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const stored = window.localStorage.getItem('color-theme');
  return themes.some((theme) => theme.id === stored) ? stored : DEFAULT_THEME_ID;
}

export default function ThemePicker({ size = 'md' }) {
  const [active, setActive] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = active;
    window.localStorage.setItem('color-theme', active);
  }, [active]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => setActive(theme.id)}
          aria-label={`${theme.label} 테마`}
          style={{
            backgroundColor: theme.color,
            boxShadow:
              active === theme.id ? `0 0 0 2px white, 0 0 0 4px ${theme.color}` : 'none',
          }}
          className={`inline-flex items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95 dark:[box-shadow:none] ${sizeClasses[size] || sizeClasses.md}`}
        />
      ))}
    </div>
  );
}
