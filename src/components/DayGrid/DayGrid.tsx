import { moodClass } from '../../utils';
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
  onSelectDay,
}: DayGridProps) {
  return (
    <div className="day-grid">
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

          const cls = [
            'day-grid__dot',
            filled ? 'day-grid__dot--filled' : '',
            todayDay ? 'day-grid__dot--today' : '',
            dayIndex === selectedDayIndex ? 'day-grid__dot--selected' : '',
            mood ? `day-grid__dot--${mood}` : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={key} className="day-grid__cell">
              <button
                className={cls}
                onClick={() => onSelectDay(dayIndex)}
                title={key}
                aria-label={key}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
