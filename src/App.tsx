import { useEffect, useMemo, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';

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

export default function App() {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const totalDays = daysInYear(year);
  const todayIndex = dayOfYear(today); // 1-based

  const [scheme, setScheme] = useState<string>('vkcom_dark');

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

    // Try to detect VK scheme
    bridge
      .send('VKWebAppGetConfig')
      .then((cfg: any) => {
        const s = cfg?.scheme;
        if (typeof s === 'string') setScheme(s);
      })
      .catch(() => {});

    const unsub = bridge.subscribe((e) => {
      // VKWebAppUpdateConfig may contain scheme
      const s = (e as any)?.detail?.data?.scheme;
      if (typeof s === 'string') setScheme(s);
    });

    // Banner ad (safe to call on web too)
    showBannerAd({ layoutType: 'resize' }).catch(() => {});

    return () => {
      // @vkontakte/vk-bridge returns void for subscribe; ignore if unsub isn't callable
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        (unsub as any)?.();
      } catch {
        // ignore
      }
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

    // Observe parent box (gridWrap) to size within available space
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
    // Render a dedicated export card (more beautiful than raw grid)
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';
    document.body.appendChild(host);

    // Render via React by cloning DOM: simplest is to mount a temporary subtree
    // We avoid React portals; just create a real node and let html2canvas capture.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const ReactDOM = await import('react-dom/client');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const root = (ReactDOM as any).createRoot(host);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      root.unmount();
      host.remove();
      return;
    }

    const canvas = await html2canvas(target, {
      backgroundColor: '#0f0f10',
      scale: 2,
    });
    const dataUrl = canvas.toDataURL('image/png');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    root.unmount();
    host.remove();

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

  const left = Math.max(0, totalDays - todayIndex);

  return (
    <ConfigProvider colorScheme={scheme as any}>
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
                      style={
                        {
                          ['--cols' as any]: gridLayout.cols,
                          ['--cell' as any]: `${gridLayout.cell}px`,
                          ['--gap' as any]: `${gridLayout.gap}px`,
                        } as React.CSSProperties
                      }
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
