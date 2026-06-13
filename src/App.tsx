import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  Group,
  Header,
  Button,
  Panel,
  PanelHeader,
  SplitCol,
  SplitLayout,
  View,
  ModalRoot,
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';

import './styles/global.css';
import './styles/layout.css';
import { loadGridDensity, saveGridDensity } from './uiPrefs';
import { useGridLayout } from './hooks/useGridLayout';
import { useVkTheme } from './hooks/useVkTheme';
import { useIsDesktop } from './hooks/useIsDesktop';
import { useYearView } from './hooks/useYearView';
import { createStoryImageDataUrl } from './storyImage';
import { isDesktopWeb as checkDesktopWeb } from './vkPlatform';

import { AppCalendarSection } from './components/AppCalendarSection/AppCalendarSection';
import { AppDayModal } from './components/AppDayModal/AppDayModal';
import { AppSidebar } from './components/AppSidebar/AppSidebar';
import { YearNav } from './components/YearNav/YearNav';

const DAY_DETAIL_MODAL = 'day-detail-modal';

export default function App() {
  const colorScheme = useVkTheme();
  const [gridDensity, setGridDensity] = useState(() => loadGridDensity());
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const isDesktop = useIsDesktop();
  // On roomy desktop columns, let the grid grow wider but keep dots capped so
  // it reads as a dense, centered block instead of leaving a void to the right.
  const { gridRef, gridLayout } = useGridLayout(
    gridDensity,
    isDesktop ? { maxWidth: 620, maxCell: 18 } : undefined,
  );
  const showDesktopExports = useMemo(() => checkDesktopWeb(), []);
  const {
    currentYear,
    realTodayIndex,
    viewYear,
    totalDays,
    todayIndex,
    selectedDayIndex,
    selectedKey,
    selectedData,
    selectedMonthIndex,
    dateKeys,
    yearDays,
    yearStats,
    badges,
    monthQuickJumps,
    isToday,
    isSelectedEditable,
    canGoPrevDay,
    canGoNextDay,
    vkSyncState,
    changeYear,
    goToToday,
    selectDay,
    goPrevDay,
    goNextDay,
    jumpToMonthStart,
    updateDay,
  } = useYearView();

  useEffect(() => {
    saveGridDensity(gridDensity);
  }, [gridDensity]);

  useEffect(() => {
    if (isDesktop && activeModal) setActiveModal(null);
  }, [isDesktop, activeModal]);

  const gridHint = isDesktop
    ? 'Нажмите на день, чтобы открыть карточку справа.'
    : 'Коснитесь дня, затем откройте карточку кнопкой ниже (повторный тап тоже откроет).';

  const closeModal = useCallback(() => setActiveModal(null), []);

  const handleSelectDay = useCallback((dayIndex: number) => {
    if (!isDesktop && dayIndex === selectedDayIndex) {
      setActiveModal(DAY_DETAIL_MODAL);
      return;
    }
    selectDay(dayIndex);
  }, [isDesktop, selectedDayIndex, selectDay]);

  const shareToStory = useCallback(async () => {
    if (isSharingStory) return;
    setIsSharingStory(true);
    try {
      const dataUrl = createStoryImageDataUrl({
        todayIndex,
        days: yearDays,
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
    } catch {
      // User cancelled, or VK Bridge / StoryBox is unavailable — graceful no-op.
    } finally {
      setIsSharingStory(false);
    }
  }, [isSharingStory, todayIndex, yearDays, dateKeys]);

  return (
    <ConfigProvider colorScheme={colorScheme}>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout
            modal={(
              <ModalRoot activeModal={activeModal} onClose={closeModal}>
                <AppDayModal
                  id={DAY_DETAIL_MODAL}
                  onClose={closeModal}
                  selectedKey={selectedKey}
                  selectedDayIndex={selectedDayIndex}
                  totalDays={totalDays}
                  isEditable={isSelectedEditable}
                  isToday={isToday}
                  dayData={selectedData}
                  onUpdateDay={updateDay}
                />
              </ModalRoot>
            )}
          >
            <SplitCol>
              <View activePanel="main">
                <Panel id="main">
                  <PanelHeader>Дни года</PanelHeader>

                  <Group className="app-hero" header={<Header>«Этот день — один из твоих 365.»</Header>}>
                    <YearNav
                      viewYear={viewYear}
                      currentYear={currentYear}
                      todayIndex={todayIndex}
                      totalDays={totalDays}
                      onChangeYear={changeYear}
                    />
                    <div className="vkui-div story-share">
                      <Button
                        size="m"
                        mode="secondary"
                        onClick={shareToStory}
                        loading={isSharingStory}
                        disabled={isSharingStory}
                        before={<span aria-hidden>✦</span>}
                      >
                        Поделиться в историю
                      </Button>
                    </div>
                  </Group>

                  <div className="app-layout">
                    <AppCalendarSection
                      viewYear={viewYear}
                      currentYear={currentYear}
                      selectedKey={selectedKey}
                      totalDays={totalDays}
                      todayIndex={todayIndex}
                      realTodayIndex={realTodayIndex}
                      selectedDayIndex={selectedDayIndex}
                      selectedMonthIndex={selectedMonthIndex}
                      dateKeys={dateKeys}
                      yearDays={yearDays}
                      gridLayout={gridLayout}
                      gridRef={gridRef}
                      gridHint={gridHint}
                      gridDensity={gridDensity}
                      monthQuickJumps={monthQuickJumps}
                      isDesktop={isDesktop}
                      canGoPrevDay={canGoPrevDay}
                      canGoNextDay={canGoNextDay}
                      onGoToToday={goToToday}
                      onSetGridDensity={setGridDensity}
                      onSelectDay={handleSelectDay}
                      onJumpToMonthStart={jumpToMonthStart}
                      onGoPrevDay={goPrevDay}
                      onGoNextDay={goNextDay}
                      onOpenDay={() => setActiveModal(DAY_DETAIL_MODAL)}
                    />

                    <AppSidebar
                      isDesktop={isDesktop}
                      selectedKey={selectedKey}
                      selectedDayIndex={selectedDayIndex}
                      totalDays={totalDays}
                      isEditable={isSelectedEditable}
                      isToday={isToday}
                      dayData={selectedData}
                      onUpdateDay={updateDay}
                      yearStats={yearStats}
                      badges={badges}
                      viewYear={viewYear}
                      todayIndex={todayIndex}
                      days={yearDays}
                      dateKeys={dateKeys}
                      vkSyncState={vkSyncState}
                      isDesktopWeb={showDesktopExports}
                    />
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
