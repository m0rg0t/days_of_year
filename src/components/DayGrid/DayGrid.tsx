import { Fragment, useMemo } from 'react';
import { MOOD_LABELS, moodClass, monthStartIndices } from '../../utils';
import { hapticSelection } from '../../haptics';
import { gridCSSVars } from '../../gridLayout';
import type { GridLayout } from '../../gridLayout';
import type { DayData } from '../../vkYearStorage';
import './DayGrid.css';

/** A screen-reader friendly Russian label describing a day and its state. */
function dayAriaLabel(key: string, status: 'today' | 'past' | 'future', data?: DayData): string {
  const statusText = status === 'today' ? 'сегодня' : status === 'past' ? 'прошедший день' : 'будущий день';
  const moodText = data?.mood ? `, настроение: ${MOOD_LABELS[data.mood]}` : '';
  const wordText = data?.word ? `, слово: ${data.word}` : '';
  return `${key} — ${statusText}${moodText}${wordText}`;
}

interface DayGridProps {
  dateKeys: string[];
  days: Record<string, DayData>;
  todayIndex: number;
  selectedDayIndex: number;
  gridLayout: GridLayout;
  gridRef: React.RefObject<HTMLDivElement | null>;
  viewYear: number;
  onSelectDay: (dayIndex: number) => void;
}

export function DayGrid({
  dateKeys,
  days,
  todayIndex,
  selectedDayIndex,
  gridLayout,
  gridRef,
  viewYear,
  onSelectDay,
}: DayGridProps) {
  const monthStarts = useMemo(() => monthStartIndices(viewYear), [viewYear]);

  const handleSelectDay = (dayIndex: number) => {
    hapticSelection();
    onSelectDay(dayIndex);
  };

  return (
    <div className="day-grid" key={viewYear}>
      <div
        className="day-grid__grid"
        ref={gridRef}
        role="group"
        aria-label={`Дни года ${viewYear}`}
        data-testid="days-grid"
        style={gridCSSVars(gridLayout)}
      >
        {dateKeys.map((key, i) => {
          const dayIndex = i + 1;
          const data = days[key];
          // todayIndex === 0 means an archived (fully past) year — every day is lived.
          const filled = todayIndex === 0 || dayIndex < todayIndex;
          const todayDay = dayIndex === todayIndex;
          const selected = dayIndex === selectedDayIndex;
          const mood = moodClass(data?.mood);
          const hasWord = !!(data?.word);
          const monthLabel = monthStarts.get(dayIndex);
          const status = todayDay ? 'today' : filled ? 'past' : 'future';

          const cls = [
            'day-grid__dot',
            filled ? 'day-grid__dot--filled' : '',
            todayDay ? 'day-grid__dot--today' : '',
            selected ? 'day-grid__dot--selected' : '',
            mood ? `day-grid__dot--${mood}` : '',
            hasWord ? 'day-grid__dot--has-word' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Fragment key={key}>
              {monthLabel && (
                <span className="day-grid__month-label">
                  {monthLabel}
                </span>
              )}
              <div
                className="day-grid__cell"
                style={{ '--i': i } as React.CSSProperties}
              >
                <button
                  className={cls}
                  onClick={() => handleSelectDay(dayIndex)}
                  title={key}
                  data-date={key}
                  aria-label={dayAriaLabel(key, status, data)}
                  aria-pressed={selected}
                  {...(todayDay ? { 'aria-current': 'date' as const } : {})}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
