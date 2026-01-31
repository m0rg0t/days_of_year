import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';

import {
  AdaptivityProvider,
  AppRoot,
  Button,
  ConfigProvider,
  Div,
  Group,
  Header,
  Input,
  Panel,
  PanelHeader,
  SimpleCell,
  SplitCol,
  SplitLayout,
  View,
} from '@vkontakte/vkui';
import type { ColorSchemeType } from '@vkontakte/vkui';

import './app.css';
import { dateKeyForDayIndex, dayOfYear, daysInYear, downloadText, monthStartIndices } from './utils';
import { getQuoteForDate } from './quotes';
import { computeYearStats } from './stats';
import { getEarnedBadges } from './badges';
import { loadYearBlobFromVk, createVkYearBlobWriter } from './vkYearStorage';
import type { Mood } from './utils';
import { hideBannerAd, showBannerAd } from './vkAds';
import type { DayData } from './vkYearStorage';
import { computeBestLayout } from './gridLayout';
import { loadStore, saveStore } from './localStore';
import type { Store } from './localStore';
import { ExportCard } from './ExportCard';

/** Map legacy VK scheme strings to VKUI ColorSchemeType. */
function toColorScheme(scheme: string): ColorSchemeType {
  if (scheme === 'space_gray' || scheme === 'vkcom_dark') return 'dark';
  if (scheme === 'bright_light' || scheme === 'vkcom_light') return 'light';
  return 'dark';
}

function moodClass(mood?: Mood) {
  if (!mood) return '';
  return `mood-${mood}`;
}

/** CSS custom properties for the grid layout. */
function gridCSSVars(layout: { cols: number; cell: number; gap: number }): React.CSSProperties {
  return {
    '--cols': layout.cols,
    '--cell': `${layout.cell}px`,
    '--gap': `${layout.gap}px`,
  } as React.CSSProperties;
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const realTodayIndex = dayOfYear(today); // 1-based

  const [viewYear, setViewYear] = useState(currentYear);
  const totalDays = daysInYear(viewYear);
  const todayIndex = viewYear === currentYear ? realTodayIndex : 0;

  const [colorScheme, setColorScheme] = useState<ColorSchemeType>('dark');

  const [store, setStore] = useState<Store>(() => loadStore(viewYear));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(realTodayIndex);

  const [showStats, setShowStats] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const vkYearWriterRef = useRef(createVkYearBlobWriter(viewYear));

  const [gridLayout, setGridLayout] = useState<{ cols: number; cell: number; gap: number }>(() => ({
    cols: 20,
    cell: 14,
    gap: 6,
  }));

  /* Sync body background with VKUI color scheme (tokens are scoped to AppRoot, not body) */
  useEffect(() => {
    const isDark = colorScheme === 'dark';
    document.body.style.background = isDark ? '#0a0a0a' : '#ebedf0';
    document.body.style.color = isDark ? '#f5f5f7' : '#1a1a1e';
  }, [colorScheme]);

  useEffect(() => {
    bridge.send('VKWebAppInit').catch(() => {});

    bridge
      .send('VKWebAppGetConfig')
      .then((cfg) => {
        if ('scheme' in cfg && typeof cfg.scheme === 'string') {
          setColorScheme(toColorScheme(cfg.scheme));
        }
      })
      .catch(() => {});

    const listener: import('@vkontakte/vk-bridge').VKBridgeSubscribeHandler = (e) => {
      if (e.detail.type === 'VKWebAppUpdateConfig') {
        const data = e.detail.data;
        if ('scheme' in data && typeof data.scheme === 'string') {
          setColorScheme(toColorScheme(data.scheme));
        }
      }
    };
    bridge.subscribe(listener);

    showBannerAd({ layoutType: 'resize' }).catch(() => {});

    return () => {
      bridge.unsubscribe(listener);
      hideBannerAd().catch(() => {});
    };
  }, []);

  const changeYear = useCallback((year: number) => {
    setViewYear(year);
    const local = loadStore(year);
    setStore(local);
    setSelectedDayIndex(year === currentYear ? realTodayIndex : 1);
    vkYearWriterRef.current = createVkYearBlobWriter(year);
  }, [currentYear, realTodayIndex]);

  // Hydrate VK data for the current viewYear
  useEffect(() => {
    (async () => {
      const vkDays = await loadYearBlobFromVk(viewYear);
      const hasAny = Object.keys(vkDays).length > 0;
      if (!hasAny) return;

      setStore((prev) => {
        const merged: Store = {
          ...prev,
          year: viewYear,
          days: {
            ...prev.days,
            ...vkDays,
          },
        };
        saveStore(merged);
        return merged;
      });
    })();
  }, [viewYear]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setGridLayout(
        computeBestLayout({
          totalDays,
          width: cr.width,
          height: cr.height,
        }),
      );
    });

    ro.observe(parent);
    return () => ro.disconnect();
  }, [totalDays]);

  const selectedKey = dateKeyForDayIndex(viewYear, selectedDayIndex);
  const selectedData = store.days[selectedKey] || {};

  const isSelectedPastOrToday = todayIndex > 0 && selectedDayIndex <= todayIndex;
  // For past years, all days are editable
  const isSelectedEditable = viewYear < currentYear || isSelectedPastOrToday;

  const dateKeys = useMemo(
    () => Array.from({ length: totalDays }).map((_, i) => dateKeyForDayIndex(viewYear, i + 1)),
    [totalDays, viewYear],
  );

  const monthStarts = useMemo(() => monthStartIndices(viewYear), [viewYear]);

  const yearStats = useMemo(
    () => computeYearStats(store.days, viewYear, todayIndex),
    [store.days, viewYear, todayIndex],
  );

  const badges = useMemo(() => getEarnedBadges(yearStats), [yearStats]);

  function updateDay(key: string, patch: Partial<DayData>) {
    setStore((prev) => {
      const nextDay: DayData = { ...(prev.days[key] || {}), ...patch };
      const next: Store = {
        ...prev,
        year: viewYear,
        days: {
          ...prev.days,
          [key]: nextDay,
        },
      };

      saveStore(next);
      vkYearWriterRef.current.setYear(next.days);

      return next;
    });
  }

  async function exportPng() {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';
    document.body.appendChild(host);

    const root = createRoot(host);
    root.render(
      <ExportCard
        year={viewYear}
        totalDays={totalDays}
        todayIndex={todayIndex}
        gridLayout={gridLayout}
        days={store.days}
        dateKeys={dateKeys}
      />,
    );

    // Give the browser a tick to paint
    await new Promise((r) => setTimeout(r, 30));

    const target = host.firstElementChild as HTMLElement | null;
    if (!target) {
      root.unmount();
      host.remove();
      return;
    }

    const canvas = await html2canvas(target, {
      backgroundColor: '#0f0f10',
      scale: 2,
    });
    const dataUrl = canvas.toDataURL('image/png');

    root.unmount();
    host.remove();

    try {
      await bridge.send('VKWebAppShowWallPostBox', {
        message: 'Этот день — один из твоих 365.',
        attachments: dataUrl,
      });
      return;
    } catch {
      // fallback to local download
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `days-of-year-${viewYear}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportJson() {
    const filename = `days-of-year-${viewYear}.json`;
    downloadText(filename, JSON.stringify(store, null, 2));
  }

  const isCurrentYear = viewYear === currentYear;
  const left = isCurrentYear ? Math.max(0, totalDays - todayIndex) : 0;

  return (
    <ConfigProvider colorScheme={colorScheme}>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout>
            <SplitCol>
              <View activePanel="main">
                <Panel id="main">
                  <PanelHeader>Дни года</PanelHeader>

                  <Group header={<Header>«Этот день — один из твоих 365.»</Header>}>
                    <Div className="yearNav">
                      <button
                        className="yearNavBtn"
                        onClick={() => changeYear(viewYear - 1)}
                        aria-label="prev-year"
                      >
                        ←
                      </button>
                      <span className="yearNavLabel">{viewYear}</span>
                      <button
                        className="yearNavBtn"
                        onClick={() => changeYear(viewYear + 1)}
                        disabled={viewYear >= currentYear}
                        aria-label="next-year"
                      >
                        →
                      </button>
                    </Div>
                    {isCurrentYear && (
                      <>
                        <SimpleCell>
                          Сегодня: {todayIndex}/{totalDays} · Осталось: {left}
                        </SimpleCell>
                        <div className="progressBar">
                          <div className="progressFill" style={{ width: `${(todayIndex / totalDays) * 100}%` }} />
                        </div>
                      </>
                    )}
                  </Group>

                  <div className="gridWrap">
                    <div
                      className="grid"
                      ref={gridRef}
                      aria-label="days-grid"
                      style={gridCSSVars(gridLayout)}
                    >
                      {dateKeys.map((key, i) => {
                        const dayIndex = i + 1;
                        const data = store.days[key];

                        const filled = dayIndex < todayIndex;
                        const todayDay = dayIndex === todayIndex;
                        const monthLabel = monthStarts.get(dayIndex);

                        const cls = [
                          'day',
                          filled ? 'filled' : '',
                          todayDay ? 'today' : '',
                          dayIndex === selectedDayIndex ? 'selected' : '',
                          data?.mood ? moodClass(data.mood) : '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <div key={key} className="dayCell">
                            {monthLabel && gridLayout.cell >= 12 && (
                              <span className="monthLabel">{monthLabel}</span>
                            )}
                            <button
                              className={cls}
                              onClick={() => setSelectedDayIndex(dayIndex)}
                              title={key}
                              aria-label={key}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Group>
                    <Div>
                      <div className="pill">
                        <strong style={{ minWidth: 96 }}>День:</strong>
                        <span>{selectedKey}</span>
                        <span className="small">({selectedDayIndex}/{totalDays})</span>
                      </div>
                      <div className="quoteBlock" data-testid="quote-block">
                        {getQuoteForDate(selectedKey)}
                      </div>
                    </Div>

                    {isSelectedEditable ? (
                      <>
                        <Group header={<Header>Настроение</Header>}>
                          <Div className="moodRow">
                            {(['blue', 'green', 'red', 'yellow'] as const).map((mood) => (
                              <button
                                key={mood}
                                className={`moodBtn ${selectedData.mood === mood ? 'active' : ''}`}
                                onClick={() => updateDay(selectedKey, { mood })}
                                aria-label={`mood-${mood}`}
                              >
                                <span className={`moodDot ${mood}`} />
                              </button>
                            ))}
                            <button
                              className="moodBtn"
                              onClick={() => updateDay(selectedKey, { mood: undefined })}
                              aria-label="mood-reset"
                            >
                              <span style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>✕</span>
                            </button>
                          </Div>
                        </Group>

                        <Group header={<Header>Вопрос дня</Header>}>
                          <Div>
                            <div className="small" style={{ marginBottom: 8 }}>
                              {isCurrentYear && selectedDayIndex === todayIndex ? 'Что сегодня было важным?' : 'Что было важным?'}
                            </div>
                            <Input
                              placeholder="одно слово"
                              value={selectedData.word || ''}
                              onChange={(e) => updateDay(selectedKey, { word: e.target.value })}
                            />
                          </Div>
                        </Group>
                      </>
                    ) : (
                      <Group header={<Header>След</Header>}>
                        <Div>
                          <div className="small">
                            {selectedData.mood ? `настроение: ${selectedData.mood}` : 'настроение: —'}
                            {' · '}
                            {selectedData.word ? `слово: ${selectedData.word}` : 'слово: —'}
                          </div>
                        </Div>
                      </Group>
                    )}

                    <Group>
                      <Div>
                        <button
                          className="statsToggle"
                          onClick={() => setShowStats((s) => !s)}
                          aria-label="toggle-stats"
                        >
                          {showStats ? 'Скрыть статистику' : 'Показать статистику'}
                        </button>
                      </Div>
                      {showStats && (
                        <Div>
                          <div className="statsPanel" data-testid="stats-panel">
                            <div className="statRow">
                              <span>Заполнено дней</span>
                              <strong>{yearStats.filledDays} / {yearStats.totalPastDays} ({yearStats.fillPercentage}%)</strong>
                            </div>
                            <div className="statRow">
                              <span>Дней со словом</span>
                              <strong>{yearStats.daysWithWord}</strong>
                            </div>
                            <div className="statRow">
                              <span>Текущий стрик</span>
                              <strong>{yearStats.currentStreak}</strong>
                            </div>
                            <div className="statRow">
                              <span>Лучший стрик</span>
                              <strong>{yearStats.longestStreak}</strong>
                            </div>
                            {yearStats.mostCommonMood && (
                              <div className="statRow">
                                <span>Частое настроение</span>
                                <span className={`moodDot ${yearStats.mostCommonMood}`} />
                              </div>
                            )}
                            {yearStats.filledDays > 0 && (
                              <div className="moodDistribution">
                                {(['blue', 'green', 'red', 'yellow'] as const).map((mood) => {
                                  const pct = yearStats.filledDays > 0
                                    ? Math.round((yearStats.moodCounts[mood] / yearStats.filledDays) * 100)
                                    : 0;
                                  return pct > 0 ? (
                                    <div
                                      key={mood}
                                      className={`moodBarSegment ${mood}`}
                                      style={{ width: `${pct}%` }}
                                      title={`${mood}: ${pct}%`}
                                    />
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          <div className="badgesRow" data-testid="badges-row">
                            {badges.map((badge) => (
                              <div
                                key={badge.id}
                                className={`badge ${badge.earned ? 'earned' : 'locked'}`}
                                title={`${badge.title}: ${badge.description}`}
                              >
                                <span className="badgeEmoji">{badge.emoji}</span>
                                <span className="badgeTitle">{badge.title}</span>
                              </div>
                            ))}
                          </div>
                        </Div>
                      )}
                    </Group>

                    <Group header={<Header>Экспорт</Header>}>
                      <Div className="controlsRow">
                        <Button size="m" mode="primary" onClick={exportPng}>
                          Экспорт PNG
                        </Button>
                        <Button size="m" mode="secondary" onClick={exportJson}>
                          Экспорт JSON
                        </Button>
                      </Div>
                      <Div className="small">
                        Данные хранятся локально (localStorage) и в VK Storage (ключ на год).
                      </Div>
                    </Group>
                  </Group>
                </Panel>
              </View>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
