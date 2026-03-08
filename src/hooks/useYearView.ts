import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getEarnedBadges } from '../badges';
import { getYearDays, loadStore, patchStoreDay, replaceYearDays, saveStore } from '../localStore';
import { computeYearStats } from '../stats';
import { dateKeyForDayIndex, dayOfYear, daysInYear, monthStartIndices } from '../utils';
import { createVkYearBlobWriter, loadYearBlobFromVk } from '../vkYearStorage';
import type { DayData, VkSyncState } from '../vkYearStorage';

type MonthQuickJump = {
  dayIndex: number;
  label: string;
  monthIndex: number;
};

type UseYearViewResult = {
  currentYear: number;
  realTodayIndex: number;
  viewYear: number;
  totalDays: number;
  todayIndex: number;
  selectedDayIndex: number;
  selectedKey: string;
  selectedData: DayData;
  selectedMonthIndex: number;
  dateKeys: string[];
  yearDays: Record<string, DayData>;
  yearStats: ReturnType<typeof computeYearStats>;
  badges: ReturnType<typeof getEarnedBadges>;
  monthQuickJumps: MonthQuickJump[];
  isToday: boolean;
  isSelectedEditable: boolean;
  canGoPrevDay: boolean;
  canGoNextDay: boolean;
  vkSyncState: VkSyncState;
  changeYear: (year: number) => void;
  goToToday: () => void;
  selectDay: (dayIndex: number) => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  jumpToMonthStart: (dayIndex: number) => void;
  updateDay: (key: string, patch: Partial<DayData>) => void;
};

export function useYearView(): UseYearViewResult {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const realTodayIndex = dayOfYear(today);

  const [viewYear, setViewYear] = useState(currentYear);
  const [store, setStore] = useState(() => loadStore(currentYear));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(realTodayIndex);
  const [vkSyncState, setVkSyncState] = useState<VkSyncState>({ status: 'idle' });

  const vkYearWriterRef = useRef(
    createVkYearBlobWriter(currentYear, { onStateChange: setVkSyncState }),
  );

  const totalDays = daysInYear(viewYear);
  const todayIndex = viewYear === currentYear ? realTodayIndex : 0;

  const dateKeys = useMemo(
    () => Array.from({ length: totalDays }).map((_, index) => dateKeyForDayIndex(viewYear, index + 1)),
    [totalDays, viewYear],
  );
  const yearDays = useMemo(() => getYearDays(store.days, viewYear), [store.days, viewYear]);
  const yearStats = useMemo(() => computeYearStats(yearDays, viewYear, todayIndex), [yearDays, viewYear, todayIndex]);
  const badges = useMemo(() => getEarnedBadges(yearStats), [yearStats]);
  const selectedKey = dateKeyForDayIndex(viewYear, selectedDayIndex);
  const selectedData = yearDays[selectedKey] || {};
  const isSelectedPastOrToday = todayIndex > 0 && selectedDayIndex <= todayIndex;
  const isSelectedEditable = viewYear < currentYear || isSelectedPastOrToday;
  const isToday = viewYear === currentYear && selectedDayIndex === todayIndex;
  const canGoPrevDay = selectedDayIndex > 1;
  const canGoNextDay = selectedDayIndex < totalDays;
  const selectedMonthIndex = useMemo(
    () => new Date(viewYear, 0, selectedDayIndex).getMonth(),
    [viewYear, selectedDayIndex],
  );
  const monthQuickJumps = useMemo(
    () => Array
      .from(monthStartIndices(viewYear).entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayIndex, label], monthIndex) => ({ dayIndex, label, monthIndex })),
    [viewYear],
  );

  const changeYear = useCallback((year: number) => {
    setViewYear(year);
    setStore(loadStore(year));
    setSelectedDayIndex(year === currentYear ? realTodayIndex : 1);
    setVkSyncState({ status: 'idle' });
    vkYearWriterRef.current = createVkYearBlobWriter(year, { onStateChange: setVkSyncState });
  }, [currentYear, realTodayIndex]);

  useEffect(() => {
    (async () => {
      const vkDays = await loadYearBlobFromVk(viewYear);
      if (Object.keys(vkDays).length === 0) return;

      setStore((prev) => {
        const merged = replaceYearDays(prev, viewYear, {
          ...getYearDays(prev.days, viewYear),
          ...vkDays,
        });
        saveStore(merged);
        return merged;
      });
    })();
  }, [viewYear]);

  const goToToday = useCallback(() => {
    if (viewYear !== currentYear) {
      changeYear(currentYear);
      return;
    }

    setSelectedDayIndex(realTodayIndex);
  }, [viewYear, currentYear, changeYear, realTodayIndex]);

  const selectDay = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
  }, []);

  const goPrevDay = useCallback(() => {
    setSelectedDayIndex((prev) => Math.max(1, prev - 1));
  }, []);

  const goNextDay = useCallback(() => {
    setSelectedDayIndex((prev) => Math.min(totalDays, prev + 1));
  }, [totalDays]);

  const jumpToMonthStart = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
  }, []);

  const updateDay = useCallback((key: string, patch: Partial<DayData>) => {
    setStore((prev) => {
      const next = patchStoreDay(prev, key, patch);
      saveStore(next);
      vkYearWriterRef.current.setYear(getYearDays(next.days, viewYear));
      return next;
    });
  }, [viewYear]);

  return {
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
  };
}
