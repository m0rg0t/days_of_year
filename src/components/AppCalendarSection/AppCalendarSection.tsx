import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Button, Group, Header } from '@vkontakte/vkui';

import { DayGrid } from '../DayGrid/DayGrid';
import { MOODS, MOOD_LABELS } from '../../utils';
import type { GridDensity, GridLayout } from '../../gridLayout';
import type { DayData } from '../../vkYearStorage';

type MonthQuickJump = {
  dayIndex: number;
  label: string;
  monthIndex: number;
};

interface AppCalendarSectionProps {
  viewYear: number;
  currentYear: number;
  selectedKey: string;
  totalDays: number;
  todayIndex: number;
  realTodayIndex: number;
  selectedDayIndex: number;
  selectedMonthIndex: number;
  dateKeys: string[];
  yearDays: Record<string, DayData>;
  gridLayout: GridLayout;
  gridRef: RefObject<HTMLDivElement | null>;
  gridHint: string;
  gridDensity: GridDensity;
  monthQuickJumps: MonthQuickJump[];
  isDesktop: boolean;
  canGoPrevDay: boolean;
  canGoNextDay: boolean;
  onGoToToday: () => void;
  onSetGridDensity: (density: GridDensity) => void;
  onSelectDay: (dayIndex: number) => void;
  onJumpToMonthStart: (dayIndex: number) => void;
  onGoPrevDay: () => void;
  onGoNextDay: () => void;
  onOpenDay: () => void;
}

export function AppCalendarSection({
  viewYear,
  currentYear,
  selectedKey,
  totalDays,
  todayIndex,
  realTodayIndex,
  selectedDayIndex,
  selectedMonthIndex,
  dateKeys,
  yearDays,
  gridLayout,
  gridRef,
  gridHint,
  gridDensity,
  monthQuickJumps,
  isDesktop,
  canGoPrevDay,
  canGoNextDay,
  onGoToToday,
  onSetGridDensity,
  onSelectDay,
  onJumpToMonthStart,
  onGoPrevDay,
  onGoNextDay,
  onOpenDay,
}: AppCalendarSectionProps) {
  const monthNavRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (isDesktop) return;

    const list = monthNavRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !active) return;

    const activeLeft = active.offsetLeft - list.offsetLeft;
    list.scrollLeft = activeLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [isDesktop, selectedMonthIndex]);

  const handleJumpToMonthStart = useCallback((dayIndex: number) => {
    onJumpToMonthStart(dayIndex);

    requestAnimationFrame(() => {
      const dateKey = dateKeys[dayIndex - 1];
      const target = dateKey
        ? gridRef.current?.querySelector<HTMLElement>(`[data-date="${dateKey}"]`)
        : null;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      target?.scrollIntoView?.({ behavior, block: 'center' });
    });
  }, [dateKeys, gridRef, onJumpToMonthStart]);

  return (
    <div className="app-layout__grid-col">
      <Group className="app-layout__grid" header={<Header>Календарь</Header>}>
        <div className="vkui-div calendar-controls">
          <Button
            size="s"
            mode="secondary"
            onClick={onGoToToday}
            disabled={viewYear === currentYear && selectedDayIndex === realTodayIndex}
          >
            Сегодня
          </Button>
          <div className="calendar-controls__density">
            <Button
              size="s"
              mode={gridDensity === 'comfortable' ? 'primary' : 'secondary'}
              onClick={() => onSetGridDensity('comfortable')}
            >
              Комфорт
            </Button>
            <Button
              size="s"
              mode={gridDensity === 'compact' ? 'primary' : 'secondary'}
              onClick={() => onSetGridDensity('compact')}
            >
              Компакт
            </Button>
          </div>
        </div>

        <div className="vkui-div calendar-controls__hint small">{gridHint}</div>

        {!isDesktop && (
          <div className="vkui-div mobile-month-nav">
            <ul className="mobile-month-nav__list" ref={monthNavRef}>
              {monthQuickJumps.map((month) => (
                <li key={month.label}>
                  <button
                    type="button"
                    className={`mobile-month-nav__chip ${month.monthIndex === selectedMonthIndex ? 'mobile-month-nav__chip--active' : ''}`}
                    onClick={() => handleJumpToMonthStart(month.dayIndex)}
                    aria-label={`Перейти к месяцу: ${month.label}`}
                    aria-current={month.monthIndex === selectedMonthIndex ? 'true' : undefined}
                    data-testid={`jump-month-${month.monthIndex + 1}`}
                  >
                    {month.label}
                  </button>
                </li>
              ))}
            </ul>
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
                aria-label="Предыдущий день"
                onClick={onGoPrevDay}
              >
                <span aria-hidden>←</span>
              </Button>
              <Button
                size="m"
                mode="primary"
                stretched
                onClick={onOpenDay}
              >
                Открыть
              </Button>
              <Button
                size="m"
                mode="secondary"
                className="mobile-day-shortcut__arrow"
                disabled={!canGoNextDay}
                aria-label="Следующий день"
                onClick={onGoNextDay}
              >
                <span aria-hidden>→</span>
              </Button>
            </div>
            <div className="mobile-day-shortcut__meta small">
              {selectedKey} · {selectedDayIndex}/{totalDays}
            </div>
          </div>
        )}

        <DayGrid
          dateKeys={dateKeys}
          days={yearDays}
          todayIndex={todayIndex}
          selectedDayIndex={selectedDayIndex}
          gridLayout={gridLayout}
          gridRef={gridRef}
          viewYear={viewYear}
          onSelectDay={onSelectDay}
        />

        <div className="vkui-div day-legend">
          <span className="day-legend__item">
            <span className="day-legend__dot day-legend__dot--filled" aria-hidden />
            Прошедшие
          </span>
          <span className="day-legend__item">
            <span className="day-legend__dot day-legend__dot--today" aria-hidden />
            Сегодня
          </span>
          {MOODS.map((mood) => (
            <span className="day-legend__item" key={mood}>
              <span className={`day-legend__dot day-legend__dot--${mood}`} aria-hidden />
              {MOOD_LABELS[mood]}
            </span>
          ))}
        </div>

      </Group>
    </div>
  );
}
