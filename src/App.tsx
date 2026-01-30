import { useEffect, useMemo, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';
import './app.css';
import { dateKeyForDayIndex, dayOfYear, daysInYear, downloadText } from './utils';
import { loadYearBlobFromVk, createVkYearBlobWriter } from './vkYearStorage';
import type { Mood } from './utils';
import { hideBannerAd, showBannerAd } from './vkAds';
import type { DayData } from './vkYearStorage';

type Store = {
  version: 1;
  year: number;
  days: Record<string, DayData>; // key: YYYY-MM-DD
};

const STORAGE_KEY = 'days_of_year:v1';

function loadStore(currentYear: number): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: 1, year: currentYear, days: {} };
    }
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || parsed.version !== 1) {
      return { version: 1, year: currentYear, days: {} };
    }
    // Keep historical data even if year changes
    return { ...parsed, year: currentYear };
  } catch {
    return { version: 1, year: currentYear, days: {} };
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const totalDays = daysInYear(year);
  const todayIndex = dayOfYear(today); // 1-based

  const [store, setStore] = useState<Store>(() => loadStore(year));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(todayIndex);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const vkYearWriterRef = useRef(createVkYearBlobWriter(year));

  const [gridLayout, setGridLayout] = useState<{ cols: number; cell: number; gap: number }>(() => ({
    cols: 20,
    cell: 14,
    gap: 6,
  }));

  useEffect(() => {
    // VK Mini Apps init (safe to call on web too)
    bridge.send('VKWebAppInit').catch(() => {});

    // Banner ad (safe to call on web too)
    showBannerAd({ layoutType: 'resize' }).catch(() => {});

    return () => {
      hideBannerAd().catch(() => {});
    };
  }, []);

  useEffect(() => {
    // Hydrate from VK Storage first (cross-device), but keep localStorage as fallback/mirror.
    // New strategy: store ONE key per year: doy:YYYY -> JSON blob of all days.
    (async () => {
      const vkDays = await loadYearBlobFromVk(year);
      const hasAny = Object.keys(vkDays).length > 0;
      if (!hasAny) return;

      setStore((prev) => {
        const merged: Store = {
          ...prev,
          year,
          days: {
            ...prev.days,
            ...vkDays,
          },
        };
        saveStore(merged);
        return merged;
      });
    })();
  }, [year]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const compute = (w: number, h: number) => {
      // Keep a bit of air: avoid touching edges on small screens
      const pad = 4;
      const W = Math.max(0, w - pad * 2);
      const H = Math.max(0, h - pad * 2);

      const candidates: Array<{ cols: number; cell: number; gap: number }> = [];

      for (let cols = 14; cols <= 26; cols++) {
        const rows = Math.ceil(totalDays / cols);

        // dynamic gap: tighter on narrow screens
        const gap = W < 420 ? 4 : 6;

        const cellW = (W - gap * (cols - 1)) / cols;
        const cellH = (H - gap * (rows - 1)) / rows;
        const cell = Math.floor(Math.min(cellW, cellH));

        if (cell >= 8) {
          candidates.push({ cols, cell, gap });
        }
      }

      // Pick the layout with the biggest dot size
      const best = candidates.sort((a, b) => b.cell - a.cell)[0];
      if (best) setGridLayout(best);
    };

    // Observe parent box (gridWrap) to size within available space
    const parent = el.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      compute(cr.width, cr.height);
    });

    ro.observe(parent);
    return () => ro.disconnect();
  }, [totalDays]);

  const selectedKey = dateKeyForDayIndex(year, selectedDayIndex);
  const selectedData = store.days[selectedKey] || {};

  const isSelectedToday = selectedDayIndex === todayIndex;

  function updateDay(key: string, patch: Partial<DayData>) {
    setStore((prev) => {
      const nextDay: DayData = { ...(prev.days[key] || {}), ...patch };
      const next: Store = {
        ...prev,
        year,
        days: {
          ...prev.days,
          [key]: nextDay,
        },
      };

      // 1) Always mirror to localStorage (fast + offline)
      saveStore(next);

      // 2) Best-effort sync to VK Storage (cross-device)
      //    Store a single key per year: doy:YYYY
      vkYearWriterRef.current.setYear(next.days);

      return next;
    });
  }

  function moodClass(mood?: Mood) {
    if (!mood) return '';
    return `mood-${mood}`;
  }

  async function exportPng() {
    if (!gridRef.current) return;
    const canvas = await html2canvas(gridRef.current, {
      backgroundColor: '#0f0f10',
      scale: 2,
    });
    const dataUrl = canvas.toDataURL('image/png');

    // Try VK share dialog (optional)
    try {
      await bridge.send('VKWebAppShowWallPostBox', {
        message: 'Этот день — один из твоих 365.',
        attachments: dataUrl,
      } as any);
      return;
    } catch {
      // fallback to local download
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `days-of-year-${year}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportJson() {
    const filename = `days-of-year-${year}.json`;
    downloadText(filename, JSON.stringify(store, null, 2));
  }

  return (
    <div className="app">
      <div className="header">
        <h1 className="title">Дни года</h1>
        <p className="subtitle">«Этот день — один из твоих 365.»</p>
      </div>

      <div className="gridWrap">
        <div
          className="grid"
          ref={gridRef}
          aria-label="days-grid"
          style={
            {
              ['--cols' as any]: gridLayout.cols,
              ['--cell' as any]: `${gridLayout.cell}px`,
              ['--gap' as any]: `${gridLayout.gap}px`,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayIndex = i + 1;
            const key = dateKeyForDayIndex(year, dayIndex);
            const data = store.days[key];

            const filled = dayIndex < todayIndex;
            const todayDay = dayIndex === todayIndex;

            const cls = [
              'day',
              filled ? 'filled' : '',
              todayDay ? 'today' : '',
              data?.mood ? moodClass(data.mood) : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={key}
                className={cls}
                onClick={() => setSelectedDayIndex(dayIndex)}
                title={key}
                aria-label={key}
              />
            );
          })}
        </div>
      </div>

      <div className="footer">
        <div className="pill">
          <strong style={{ minWidth: 96 }}>День:</strong>
          <span>{selectedKey}</span>
          <span className="small">({selectedDayIndex}/{totalDays})</span>
        </div>

        {isSelectedToday ? (
          <>
            <div className="pill">
              <strong style={{ minWidth: 96 }}>Настроение:</strong>
              <div className="controlsRow">
                <button className="btn" onClick={() => updateDay(selectedKey, { mood: 'blue' })}>🔵</button>
                <button className="btn" onClick={() => updateDay(selectedKey, { mood: 'green' })}>🟢</button>
                <button className="btn" onClick={() => updateDay(selectedKey, { mood: 'red' })}>🔴</button>
                <button className="btn" onClick={() => updateDay(selectedKey, { mood: 'yellow' })}>🟡</button>
                <button className="btn" onClick={() => updateDay(selectedKey, { mood: undefined })}>сброс</button>
              </div>
            </div>

            <div className="pill">
              <strong style={{ minWidth: 96 }}>Вопрос дня:</strong>
              <span className="small" style={{ marginRight: 8 }}>Что сегодня было важным?</span>
              <input
                className="input"
                placeholder="одно слово"
                value={selectedData.word || ''}
                onChange={(e) => updateDay(selectedKey, { word: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div className="pill">
            <strong style={{ minWidth: 96 }}>След:</strong>
            <span className="small">
              {selectedData.mood ? `настроение: ${selectedData.mood}` : 'настроение: —'}
              {' · '}
              {selectedData.word ? `слово: ${selectedData.word}` : 'слово: —'}
            </span>
          </div>
        )}

        <div className="controlsRow">
          <button className="btn primary" onClick={exportPng}>Экспорт PNG</button>
          <button className="btn" onClick={exportJson}>Экспорт JSON</button>
        </div>

        <div className="small">
          Данные хранятся локально (localStorage). Без аккаунта и без сервера.
        </div>
      </div>
    </div>
  );
}
