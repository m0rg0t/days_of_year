import { Fragment, useMemo } from 'react';
import { moodClass, monthStartIndices } from '../../utils';
import { hapticSelection } from '../../haptics';
import type { GridLayout } from '../../gridLayout';
import type { DayData } from '../../vkYearStorage';
import './DayGrid.css';

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

function gridCSSVars(layout: GridLayout): React.CSSProperties {
  return {
    '--cols': layout.cols,
    '--cell': `${layout.cell}px`,
    '--gap': `${layout.gap}px`,
  } as React.CSSProperties;
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
        aria-label="days-grid"
        style={gridCSSVars(gridLayout)}
      >
        {dateKeys.map((key, i) => {
          const dayIndex = i + 1;
          const data = days[key];
          const filled = dayIndex < todayIndex;
          const todayDay = dayIndex === todayIndex;
          const mood = moodClass(data?.mood);
          const hasWord = !!(data?.word);
          const monthLabel = monthStarts.get(dayIndex);

          const cls = [
            'day-grid__dot',
            filled ? 'day-grid__dot--filled' : '',
            todayDay ? 'day-grid__dot--today' : '',
            dayIndex === selectedDayIndex ? 'day-grid__dot--selected' : '',
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
                  aria-label={key}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
