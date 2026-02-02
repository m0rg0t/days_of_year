import './ExportCard.css';
import type { DayData } from '../../vkYearStorage';
import { moodClass } from '../../utils';
import type { GridLayout } from '../../gridLayout';

export function ExportCard(props: {
  year: number;
  totalDays: number;
  todayIndex: number;
  gridLayout: GridLayout;
  days: Record<string, DayData>;
  dateKeys: string[];
}) {
  const { year, totalDays, todayIndex, gridLayout, days, dateKeys } = props;
  const left = Math.max(0, totalDays - todayIndex);

  return (
    <div className="export-card">
      <div className="export-card__header">
        <h2 className="export-card__title">Дни года</h2>
        <p className="export-card__subtitle">«Этот день — один из твоих 365.»</p>
        <div className="export-card__meta">
          <span className="export-card__badge">Год: {year}</span>
          <span className="export-card__badge">Сегодня: {todayIndex}/{totalDays}</span>
          <span className="export-card__badge">Осталось: {left}</span>
        </div>
      </div>

      <div
        className="export-card__grid"
        style={{
          '--cols': gridLayout.cols,
          '--cell': `${gridLayout.cell}px`,
          '--gap': `${gridLayout.gap}px`,
        } as React.CSSProperties}
      >
        {dateKeys.map((key, i) => {
          const dayIndex = i + 1;
          const filled = dayIndex < todayIndex;
          const isToday = dayIndex === todayIndex;
          const data = days[key];
          const mood = moodClass(data?.mood);

          const cls = [
            'export-card__dot',
            filled ? 'export-card__dot--filled' : '',
            isToday ? 'export-card__dot--today' : '',
            mood ? `export-card__dot--${mood}` : '',
          ]
            .filter(Boolean)
            .join(' ');

          return <div key={key} className={cls} />;
        })}
      </div>
    </div>
  );
}
