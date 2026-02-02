import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  Group,
  Header,
  Button,
  Div,
  Panel,
  PanelHeader,
  SplitCol,
  SplitLayout,
  View,
} from '@vkontakte/vkui';

import './styles/global.css';
import './styles/layout.css';
import { dateKeyForDayIndex, dayOfYear, daysInYear, monthStartIndices } from './utils';
import { computeYearStats } from './stats';
import { getEarnedBadges } from './badges';
import { loadYearBlobFromVk, createVkYearBlobWriter } from './vkYearStorage';
import type { DayData } from './vkYearStorage';
import { loadStore, saveStore } from './localStore';
import type { Store } from './localStore';
import { loadGridDensity, saveGridDensity } from './uiPrefs';
import { useGridLayout } from './hooks/useGridLayout';
import { useVkTheme } from './hooks/useVkTheme';

import { YearNav } from './components/YearNav/YearNav';
import { DayGrid } from './components/DayGrid/DayGrid';
import { DayDetail } from './components/DayDetail/DayDetail';
import { StatsPanel } from './components/StatsPanel/StatsPanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';

export default function App() {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const realTodayIndex = dayOfYear(today);

  const [viewYear, setViewYear] = useState(currentYear);
  const totalDays = daysInYear(viewYear);
  const todayIndex = viewYear === currentYear ? realTodayIndex : 0;

  const colorScheme = useVkTheme();
  const [store, setStore] = useState<Store>(() => loadStore(viewYear));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(realTodayIndex);
  const [gridDensity, setGridDensity] = useState(() => loadGridDensity());

  const { gridRef, gridLayout } = useGridLayout(gridDensity);
  const vkYearWriterRef = useRef(createVkYearBlobWriter(viewYear));

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

  useEffect(() => {
    saveGridDensity(gridDensity);
  }, [gridDensity]);

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

  const goToToday = useCallback(() => {
    if (viewYear !== currentYear) {
      changeYear(currentYear);
      return;
    }
    setSelectedDayIndex(realTodayIndex);
  }, [viewYear, currentYear, changeYear, realTodayIndex]);

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

                  <div className="app-layout">
                    <Group className="app-layout__grid" header={<Header>Календарь</Header>}>
                      <Div className="calendar-controls">
                        <Button
                          size="s"
                          mode="secondary"
                          onClick={goToToday}
                          disabled={viewYear === currentYear && selectedDayIndex === realTodayIndex}
                        >
                          Сегодня
                        </Button>
                        <div className="calendar-controls__density">
                          <Button
                            size="s"
                            mode={gridDensity === 'comfortable' ? 'primary' : 'secondary'}
                            onClick={() => setGridDensity('comfortable')}
                          >
                            Комфорт
                          </Button>
                          <Button
                            size="s"
                            mode={gridDensity === 'compact' ? 'primary' : 'secondary'}
                            onClick={() => setGridDensity('compact')}
                          >
                            Компакт
                          </Button>
                        </div>
                      </Div>
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
                    </Group>

                    <div className="app-layout__side">
                      <Group header={<Header>День</Header>}>
                        <DayDetail
                          selectedKey={selectedKey}
                          selectedDayIndex={selectedDayIndex}
                          totalDays={totalDays}
                          isEditable={isSelectedEditable}
                          isToday={isToday}
                          dayData={selectedData}
                          onUpdateDay={updateDay}
                        />
                      </Group>

                      <Group header={<Header>Статистика</Header>}>
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
                    </div>
                  </div>
                </Panel>
              </View>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
