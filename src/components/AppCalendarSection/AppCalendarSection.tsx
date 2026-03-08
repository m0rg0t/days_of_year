import type { RefObject } from 'react';
import { Button, Group, Header } from '@vkontakte/vkui';

import { DayGrid } from '../DayGrid/DayGrid';
import type { GridLayout } from '../../gridLayout';
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
  gridDensity: 'comfortable' | 'compact';
  monthQuickJumps: MonthQuickJump[];
  isDesktop: boolean;
  canGoPrevDay: boolean;
  canGoNextDay: boolean;
  onGoToToday: () => void;
  onSetGridDensity: (density: 'comfortable' | 'compact') => void;
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

        {!isDesktop && (
          <div className="vkui-div mobile-month-nav">
            <div className="mobile-month-nav__list" role="list">
              {monthQuickJumps.map((month) => (
                <button
                  key={month.label}
                  className={`mobile-month-nav__chip ${month.monthIndex === selectedMonthIndex ? 'mobile-month-nav__chip--active' : ''}`}
                  onClick={() => onJumpToMonthStart(month.dayIndex)}
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
                onClick={onGoPrevDay}
              >
                ←
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
                aria-label="next-day"
                onClick={onGoNextDay}
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
  );
}
