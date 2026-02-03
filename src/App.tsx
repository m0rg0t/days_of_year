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
  PanelHeaderButton,
  SplitCol,
  SplitLayout,
  View,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';

import './styles/global.css';
import './styles/layout.css';
import { dateKeyForDayIndex, dayOfYear, daysInYear } from './utils';
import { computeYearStats } from './stats';
import { getEarnedBadges } from './badges';
import { loadYearBlobFromVk, createVkYearBlobWriter } from './vkYearStorage';
import type { DayData } from './vkYearStorage';
import { loadStore, saveStore } from './localStore';
import type { Store } from './localStore';
import { loadGridDensity, saveGridDensity } from './uiPrefs';
import { useGridLayout } from './hooks/useGridLayout';
import { useVkTheme } from './hooks/useVkTheme';
import { useIsDesktop } from './hooks/useIsDesktop';
import { createStoryImageDataUrl } from './storyImage';

import { YearNav } from './components/YearNav/YearNav';
import { DayGrid } from './components/DayGrid/DayGrid';
import { DayDetail } from './components/DayDetail/DayDetail';
import { StatsPanel } from './components/StatsPanel/StatsPanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';

const DAY_DETAIL_MODAL = 'day-detail-modal';

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
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { gridRef, gridLayout } = useGridLayout(gridDensity);
  const isDesktop = useIsDesktop();
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

  useEffect(() => {
    if (isDesktop && activeModal) setActiveModal(null);
  }, [isDesktop, activeModal]);

  const selectedKey = dateKeyForDayIndex(viewYear, selectedDayIndex);
  const selectedData = store.days[selectedKey] || {};
  const isSelectedPastOrToday = todayIndex > 0 && selectedDayIndex <= todayIndex;
  const isSelectedEditable = viewYear < currentYear || isSelectedPastOrToday;
  const isToday = viewYear === currentYear && selectedDayIndex === todayIndex;

  const dateKeys = useMemo(
    () => Array.from({ length: totalDays }).map((_, i) => dateKeyForDayIndex(viewYear, i + 1)),
    [totalDays, viewYear],
  );
  const yearStats = useMemo(() => computeYearStats(store.days, viewYear, todayIndex), [store.days, viewYear, todayIndex]);
  const badges = useMemo(() => getEarnedBadges(yearStats), [yearStats]);

  const goToToday = useCallback(() => {
    if (viewYear !== currentYear) {
      changeYear(currentYear);
      return;
    }
    setSelectedDayIndex(realTodayIndex);
  }, [viewYear, currentYear, changeYear, realTodayIndex]);

  const closeModal = useCallback(() => setActiveModal(null), []);

  const handleSelectDay = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    if (!isDesktop) {
      setActiveModal(DAY_DETAIL_MODAL);
    }
  }, [isDesktop]);

  const shareToStory = useCallback(async () => {
    if (isSharingStory) return;
    setIsSharingStory(true);
    try {
      const dataUrl = createStoryImageDataUrl({
        todayIndex,
        days: store.days,
        dateKeys,
      });

      if (!dataUrl) return;

      await bridge.send('VKWebAppShowStoryBox', {
        background_type: 'image',
        blob: dataUrl,
        attachment: {
          type: 'url',
          url: window.location.href,
          text: 'open',
        },
      });
    } catch (error) {
      console.error('Failed to share story', error);
    } finally {
      setIsSharingStory(false);
    }
  }, [isSharingStory, viewYear, totalDays, todayIndex, store.days, dateKeys]);

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
          <SplitLayout
            modal={(
              <ModalRoot activeModal={activeModal} onClose={closeModal}>
                <ModalPage
                  id={DAY_DETAIL_MODAL}
                  onClose={closeModal}
                  dynamicContentHeight
                  header={(
                    <ModalPageHeader
                      after={(
                        <PanelHeaderButton onClick={closeModal}>
                          Готово
                        </PanelHeaderButton>
                      )}
                    >
                      День
                    </ModalPageHeader>
                  )}
                >
                  <DayDetail
                    selectedKey={selectedKey}
                    selectedDayIndex={selectedDayIndex}
                    totalDays={totalDays}
                    isEditable={isSelectedEditable}
                    isToday={isToday}
                    dayData={selectedData}
                    onUpdateDay={updateDay}
                  />
                </ModalPage>
              </ModalRoot>
            )}
          >
            <SplitCol>
              <View activePanel="main">
                <Panel id="main">
                  <PanelHeader>Дни года</PanelHeader>

                  <Group header={<Header>«Этот день — один из твоих 365.»</Header>}>
                    <Div className="story-share">
                      <Button
                        size="m"
                        mode="primary"
                        onClick={shareToStory}
                        loading={isSharingStory}
                        disabled={isSharingStory}
                      >
                        Поделиться в историю
                      </Button>
                    </Div>
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
                        gridLayout={gridLayout}
                        gridRef={gridRef}
                        onSelectDay={handleSelectDay}
                      />
                    </Group>

                    <div className="app-layout__side">
                      {isDesktop && (
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
                      )}

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
