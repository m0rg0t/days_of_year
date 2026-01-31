import { useEffect, useMemo, useRef, useState } from 'react';
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
import { dateKeyForDayIndex, dayOfYear, daysInYear, downloadText } from './utils';
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
  const year = today.getFullYear();
  const totalDays = daysInYear(year);
  const todayIndex = dayOfYear(today); // 1-based

  const [colorScheme, setColorScheme] = useState<ColorSchemeType>('dark');

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

  useEffect(() => {
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

  const selectedKey = dateKeyForDayIndex(year, selectedDayIndex);
  const selectedData = store.days[selectedKey] || {};

  const isSelectedToday = selectedDayIndex === todayIndex;

  const dateKeys = useMemo(
    () => Array.from({ length: totalDays }).map((_, i) => dateKeyForDayIndex(year, i + 1)),
    [totalDays, year],
  );

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
        year={year}
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
    a.download = `days-of-year-${year}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportJson() {
    const filename = `days-of-year-${year}.json`;
    downloadText(filename, JSON.stringify(store, null, 2));
  }

  const left = Math.max(0, totalDays - todayIndex);

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
                    <SimpleCell>
                      Сегодня: {todayIndex}/{totalDays} · Осталось: {left}
                    </SimpleCell>
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

                  <Group>
                    <Div>
                      <div className="pill">
                        <strong style={{ minWidth: 96 }}>День:</strong>
                        <span>{selectedKey}</span>
                        <span className="small">({selectedDayIndex}/{totalDays})</span>
                      </div>
                    </Div>

                    {isSelectedToday ? (
                      <>
                        <Group header={<Header>Настроение</Header>}>
                          <Div className="controlsRow">
                            <Button size="m" mode="secondary" onClick={() => updateDay(selectedKey, { mood: 'blue' })}>
                              🔵
                            </Button>
                            <Button size="m" mode="secondary" onClick={() => updateDay(selectedKey, { mood: 'green' })}>
                              🟢
                            </Button>
                            <Button size="m" mode="secondary" onClick={() => updateDay(selectedKey, { mood: 'red' })}>
                              🔴
                            </Button>
                            <Button size="m" mode="secondary" onClick={() => updateDay(selectedKey, { mood: 'yellow' })}>
                              🟡
                            </Button>
                            <Button size="m" mode="tertiary" onClick={() => updateDay(selectedKey, { mood: undefined })}>
                              сброс
                            </Button>
                          </Div>
                        </Group>

                        <Group header={<Header>Вопрос дня</Header>}>
                          <Div>
                            <div className="small" style={{ marginBottom: 8 }}>
                              Что сегодня было важным?
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
