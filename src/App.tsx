import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';

import {
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  Group,
  Header,
  Panel,
  PanelHeader,
  SplitCol,
  SplitLayout,
  View,
} from '@vkontakte/vkui';
import type { ColorSchemeType } from '@vkontakte/vkui';

import './styles/global.css';
import { dateKeyForDayIndex, dayOfYear, daysInYear, monthStartIndices } from './utils';
import { computeYearStats } from './stats';
import { getEarnedBadges } from './badges';
import { loadYearBlobFromVk, createVkYearBlobWriter } from './vkYearStorage';
import type { DayData } from './vkYearStorage';
import { hideBannerAd, showBannerAd } from './vkAds';
import { computeBestLayout } from './gridLayout';
import { loadStore, saveStore } from './localStore';
import type { Store } from './localStore';

import { YearNav } from './components/YearNav/YearNav';
import { DayGrid } from './components/DayGrid/DayGrid';
import { DayDetail } from './components/DayDetail/DayDetail';
import { StatsPanel } from './components/StatsPanel/StatsPanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';

function toColorScheme(scheme: string): ColorSchemeType {
  if (scheme === 'space_gray' || scheme === 'vkcom_dark') return 'dark';
  if (scheme === 'bright_light' || scheme === 'vkcom_light') return 'light';
  return 'dark';
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const realTodayIndex = dayOfYear(today);

  const [viewYear, setViewYear] = useState(currentYear);
  const totalDays = daysInYear(viewYear);
  const todayIndex = viewYear === currentYear ? realTodayIndex : 0;

  const [colorScheme, setColorScheme] = useState<ColorSchemeType>('dark');
  const [store, setStore] = useState<Store>(() => loadStore(viewYear));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(realTodayIndex);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const vkYearWriterRef = useRef(createVkYearBlobWriter(viewYear));

  const [gridLayout, setGridLayout] = useState<{ cols: number; cell: number; gap: number }>(() => ({
    cols: 20, cell: 14, gap: 6,
  }));

  // Sync body background with VKUI color scheme
  useEffect(() => {
    const isDark = colorScheme === 'dark';
    document.body.style.background = isDark ? '#0a0a0a' : '#ebedf0';
    document.body.style.color = isDark ? '#f5f5f7' : '#1a1a1e';
  }, [colorScheme]);

  // VK Bridge init + config listener
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
      if (Object.keys(vkDays).length === 0) return;
      setStore((prev) => {
        const merged: Store = { ...prev, year: viewYear, days: { ...prev.days, ...vkDays } };
        saveStore(merged);
        return merged;
      });
    })();
  }, [viewYear]);

  // ResizeObserver for grid layout
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setGridLayout(computeBestLayout({ totalDays, width: cr.width, height: cr.height }));
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [totalDays]);

  const selectedKey = dateKeyForDayIndex(viewYear, selectedDayIndex);
  const selectedData = store.days[selectedKey] || {};
  const isSelectedPastOrToday = todayIndex > 0 && selectedDayIndex <= todayIndex;
  const isSelectedEditable = viewYear < currentYear || isSelectedPastOrToday;
  const isToday = viewYear === currentYear && selectedDayIndex === todayIndex;

  const dateKeys = useMemo(
    () => Array.from({ length: totalDays }).map((_, i) => dateKeyForDayIndex(viewYear, i + 1)),
    [totalDays, viewYear],
  );
  const monthStarts = useMemo(() => monthStartIndices(viewYear), [viewYear]);
  const yearStats = useMemo(() => computeYearStats(store.days, viewYear, todayIndex), [store.days, viewYear, todayIndex]);
  const badges = useMemo(() => getEarnedBadges(yearStats), [yearStats]);

  function updateDay(key: string, patch: Partial<DayData>) {
    setStore((prev) => {
      const nextDay: DayData = { ...(prev.days[key] || {}), ...patch };
      const next: Store = { ...prev, year: viewYear, days: { ...prev.days, [key]: nextDay } };
      saveStore(next);
      vkYearWriterRef.current.setYear(next.days);
      return next;
    });
  }

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
                    <YearNav
                      viewYear={viewYear}
                      currentYear={currentYear}
                      todayIndex={todayIndex}
                      totalDays={totalDays}
                      onChangeYear={changeYear}
                    />
                  </Group>

                  <DayGrid
                    dateKeys={dateKeys}
                    days={store.days}
                    todayIndex={todayIndex}
                    selectedDayIndex={selectedDayIndex}
                    monthStarts={monthStarts}
                    gridLayout={gridLayout}
                    gridRef={gridRef}
                    onSelectDay={setSelectedDayIndex}
                  />

                  <Group>
                    <DayDetail
                      selectedKey={selectedKey}
                      selectedDayIndex={selectedDayIndex}
                      totalDays={totalDays}
                      isEditable={isSelectedEditable}
                      isToday={isToday}
                      dayData={selectedData}
                      onUpdateDay={updateDay}
                    />

                    <Group>
                      <StatsPanel yearStats={yearStats} badges={badges} />
                    </Group>

                    <ExportPanel
                      viewYear={viewYear}
                      totalDays={totalDays}
                      todayIndex={todayIndex}
                      gridLayout={gridLayout}
                      store={store}
                      dateKeys={dateKeys}
                    />
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
