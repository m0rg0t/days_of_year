import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  Group,
  Header,
  Button,
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
import { useIsDesktop } from './hooks/useIsDesktop';
import { createStoryImageDataUrl } from './storyImage';
import { isDesktopWeb as checkDesktopWeb } from './vkPlatform';

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
  const showDesktopExports = useMemo(() => checkDesktopWeb(), []);
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
  const canGoPrevDay = selectedDayIndex > 1;
  const canGoNextDay = selectedDayIndex < totalDays;
  const selectedMonthIndex = useMemo(
    () => new Date(viewYear, 0, selectedDayIndex).getMonth(),
    [viewYear, selectedDayIndex],
  );
  const gridHint = isDesktop
    ? 'Нажмите на день, чтобы открыть карточку справа.'
    : 'Коснитесь дня, затем откройте карточку кнопкой ниже (повторный тап тоже откроет).';
  const monthQuickJumps = useMemo(
    () => Array
      .from(monthStartIndices(viewYear).entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayIndex, label], monthIndex) => ({ dayIndex, label, monthIndex })),
    [viewYear],
  );

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
    if (!isDesktop && dayIndex === selectedDayIndex) {
      setActiveModal(DAY_DETAIL_MODAL);
      return;
    }
    setSelectedDayIndex(dayIndex);
  }, [isDesktop, selectedDayIndex]);

  const goPrevDay = useCallback(() => {
    setSelectedDayIndex((prev) => Math.max(1, prev - 1));
  }, []);

  const goNextDay = useCallback(() => {
    setSelectedDayIndex((prev) => Math.min(totalDays, prev + 1));
  }, [totalDays]);

  const jumpToMonthStart = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
  }, []);

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

                  <Group className="app-hero" header={<Header>«Этот день — один из твоих 365.»</Header>}>
                    <div className="vkui-div story-share">
                      <Button
                        size="m"
                        mode="primary"
                        onClick={shareToStory}
                        loading={isSharingStory}
                        disabled={isSharingStory}
                      >
                        Поделиться в историю
                      </Button>
                    </div>
                    <YearNav
                      viewYear={viewYear}
                      currentYear={currentYear}
                      todayIndex={todayIndex}
                      totalDays={totalDays}
                      onChangeYear={changeYear}
                    />
                  </Group>

                  <div className="app-layout">
                    <div className="app-layout__grid-col">
                      <Group className="app-layout__grid" header={<Header>Календарь</Header>}>
                      <div className="vkui-div calendar-controls">
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
                      </div>
                      <div className="vkui-div calendar-controls__hint small">{gridHint}</div>
                      <DayGrid
                        dateKeys={dateKeys}
                        days={store.days}
                        todayIndex={todayIndex}
                        selectedDayIndex={selectedDayIndex}
                        gridLayout={gridLayout}
                        gridRef={gridRef}
                        viewYear={viewYear}
                        onSelectDay={handleSelectDay}
                      />
                      {!isDesktop && (
                        <div className="vkui-div mobile-month-nav">
                          <div className="mobile-month-nav__list" role="list">
                            {monthQuickJumps.map((month) => (
                              <button
                                key={month.label}
                                className={`mobile-month-nav__chip ${month.monthIndex === selectedMonthIndex ? 'mobile-month-nav__chip--active' : ''}`}
                                onClick={() => jumpToMonthStart(month.dayIndex)}
                                aria-label={`jump-month-${month.monthIndex + 1}`}
                              >
                                {month.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isDesktop && (
                        <div className="vkui-div mobile-day-shortcut">
                          <div className="mobile-day-shortcut__row">
                            <Button
                              size="m"
                              mode="secondary"
                              className="mobile-day-shortcut__arrow"
                              disabled={!canGoPrevDay}
                              aria-label="previous-day"
                              onClick={goPrevDay}
                            >
                              ←
                            </Button>
                            <Button
                              size="m"
                              mode="primary"
                              stretched
                              onClick={() => setActiveModal(DAY_DETAIL_MODAL)}
                            >
                              Открыть
                            </Button>
                            <Button
                              size="m"
                              mode="secondary"
                              className="mobile-day-shortcut__arrow"
                              disabled={!canGoNextDay}
                              aria-label="next-day"
                              onClick={goNextDay}
                            >
                              →
                            </Button>
                          </div>
                          <div className="mobile-day-shortcut__meta small">
                            {selectedKey} · {selectedDayIndex}/{totalDays}
                          </div>
                        </div>
                      )}
                      </Group>
                    </div>

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
                        <StatsPanel yearStats={yearStats} badges={badges} isDesktop={isDesktop} />
                      </Group>

                      <ExportPanel
                        viewYear={viewYear}
                        totalDays={totalDays}
                        todayIndex={todayIndex}
                        gridLayout={gridLayout}
                        store={store}
                        dateKeys={dateKeys}
                        isDesktopWeb={showDesktopExports}
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
