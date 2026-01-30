import { useEffect, useMemo, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';
import './app.css';
import { dateKeyForDayIndex, dayOfYear, daysInYear, downloadText } from './utils';
import type { Mood } from './utils';

type DayData = {
  mood?: Mood;
  word?: string; // one word (we don't enforce hard)
};

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

  useEffect(() => {
    // VK Mini Apps init (safe to call on web too)
    bridge.send('VKWebAppInit').catch(() => {});
  }, []);

  const selectedKey = dateKeyForDayIndex(year, selectedDayIndex);
  const selectedData = store.days[selectedKey] || {};

  const isSelectedToday = selectedDayIndex === todayIndex;

  function updateDay(key: string, patch: Partial<DayData>) {
    setStore((prev) => {
      const next: Store = {
        ...prev,
        year,
        days: {
          ...prev.days,
          [key]: { ...(prev.days[key] || {}), ...patch },
        },
      };
      saveStore(next);
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
        <div className="grid" ref={gridRef} aria-label="days-grid">
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
