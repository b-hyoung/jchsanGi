'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Pipette } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { trackEvent } from '@/lib/analyticsClient';
import {
  ALL_THEME_IDS,
  DEFAULT_CUSTOM_THEME_COLOR,
  DEFAULT_THEME_ID,
  THEME_OPTIONS,
  normalizeCustomThemeColor,
  normalizeThemeId,
} from '@/lib/themeCatalog';

const WHEEL_STEP_THRESHOLD = 36;

function getInitialTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  return normalizeThemeId(window.localStorage.getItem('color-theme'));
}

function getInitialCustomColor() {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_THEME_COLOR;
  return normalizeCustomThemeColor(window.localStorage.getItem('custom-theme-color'));
}

export default function ThemeControls() {
  const [open, setOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(getInitialTheme);
  const [customColor, setCustomColor] = useState(getInitialCustomColor);
  const wheelDeltaRef = useRef(0);
  const colorInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = activeTheme;
    window.localStorage.setItem('color-theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--custom-theme-color', customColor);
    window.localStorage.setItem('custom-theme-color', customColor);
  }, [customColor]);

  const recordThemeChange = (themeId, nextCustomColor, source) => {
    const normalizedTheme = normalizeThemeId(themeId);
    const normalizedCustomColor = normalizeCustomThemeColor(nextCustomColor);
    trackEvent('theme_change', {
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      payload: {
        themeId: normalizedTheme,
        customColor: normalizedTheme === 'custom' ? normalizedCustomColor : '',
        source,
      },
    });
  };

  const applyTheme = (themeId, options = {}) => {
    const normalizedTheme = normalizeThemeId(themeId);
    const nextCustomColor = normalizeCustomThemeColor(options.customColor ?? customColor);
    setActiveTheme(normalizedTheme);
    if (normalizedTheme === 'custom') {
      setCustomColor(nextCustomColor);
    }
    if (options.track !== false) {
      recordThemeChange(normalizedTheme, nextCustomColor, options.source || 'button');
    }
  };

  const moveTheme = (direction, source) => {
    const currentIndex = ALL_THEME_IDS.findIndex((themeId) => themeId === activeTheme);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + ALL_THEME_IDS.length) % ALL_THEME_IDS.length;
    applyTheme(ALL_THEME_IDS[nextIndex], { source });
  };

  const handleWheel = (event) => {
    if (!open) return;
    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    wheelDeltaRef.current += dominantDelta;

    if (Math.abs(wheelDeltaRef.current) < WHEEL_STEP_THRESHOLD) return;

    event.preventDefault();
    moveTheme(wheelDeltaRef.current > 0 ? 1 : -1, 'wheel');
    wheelDeltaRef.current = 0;
  };

  const handleKeyDown = (event) => {
    if (!open) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveTheme(event.key === 'ArrowRight' ? 1 : -1, 'keyboard');
  };

  const openColorPicker = () => {
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (event) => {
    const nextColor = normalizeCustomThemeColor(event.target.value);
    applyTheme('custom', { customColor: nextColor, source: 'color-picker' });
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`overflow-hidden rounded-full transition-[max-width,opacity,transform] duration-400 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? 'max-w-64 translate-x-0 opacity-100' : 'max-w-0 -translate-x-1 opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div
          role="group"
          aria-label="색상 테마 선택"
          tabIndex={open ? 0 : -1}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          className={`flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2 py-1 shadow-sm outline-none transition-[opacity,transform] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] dark:border-slate-700 dark:bg-slate-900/90 ${
            open ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'
          }`}
          title="클릭하거나 스크롤로 색을 바꿀 수 있습니다."
        >
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={openColorPicker}
            aria-label="사용자 지정 색상 선택"
            style={{
              backgroundColor: customColor,
              boxShadow:
                activeTheme === 'custom' ? `0 0 0 2px white, 0 0 0 4px ${customColor}` : 'none',
              transitionDelay: `${open ? 80 : 0}ms`,
            }}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition-[transform,opacity,scale] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              open ? 'translate-x-0 scale-100 opacity-100' : '-translate-x-2 scale-90 opacity-0'
            } dark:[box-shadow:none]`}
            tabIndex={open ? 0 : -1}
            title="직접 색 고르기"
          >
            <Pipette className="h-3 w-3" />
          </button>
          {THEME_OPTIONS.map((theme, index) => {
            const delay = open ? 110 + index * 38 : 0;
            return (
              <button
                key={theme.id}
                type="button"
                aria-label={`${theme.label} 테마`}
                onClick={() => applyTheme(theme.id, { source: 'button' })}
                style={{
                  backgroundColor: theme.color,
                  boxShadow:
                    activeTheme === theme.id ? `0 0 0 2px white, 0 0 0 4px ${theme.color}` : 'none',
                  transitionDelay: `${delay}ms`,
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-[transform,opacity,scale] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  open ? 'translate-x-0 scale-100 opacity-100' : '-translate-x-2 scale-90 opacity-0'
                } dark:[box-shadow:none]`}
                tabIndex={open ? 0 : -1}
                title={`${theme.label} 테마`}
              />
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? '테마 색상 닫기' : '테마 색상 펼치기'}
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-[background-color,border-color,transform] duration-200 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.96] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 motion-reduce:transition-none"
      >
        <ChevronLeft
          className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? '' : 'rotate-180'}`}
        />
      </button>

      <ThemeToggle size="sm" />
    </div>
  );
}
