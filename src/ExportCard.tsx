import './exportCard.css';
import type { DayData } from './vkYearStorage';

export function ExportCard(props: {
  year: number;
  totalDays: number;
  todayIndex: number; // 1-based
  gridLayout: { cols: number; cell: number; gap: number };
  days: Record<string, DayData>;
  dateKeys: string[]; // ordered
}) {
  const { year, totalDays, todayIndex, gridLayout, days, dateKeys } = props;
  const left = Math.max(0, totalDays - todayIndex);

  return (
    <div className="exportCard">
      <div className="exportHeader">
        <h2 className="exportTitle">Дни года</h2>
        <p className="exportSubtitle">«Этот день — один из твоих 365.»</p>
        <div className="exportMeta">
          <span className="exportBadge">Год: {year}</span>
          <span className="exportBadge">Сегодня: {todayIndex}/{totalDays}</span>
          <span className="exportBadge">Осталось: {left}</span>
        </div>
      </div>

      <div
        className="exportGrid"
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

          const cls = [
            'exportDot',
            filled ? 'filled' : '',
            isToday ? 'today' : '',
            data?.mood ? `mood-${data.mood}` : '',
          ]
            .filter(Boolean)
            .join(' ');

          return <div key={key} className={cls} />;
        })}
      </div>
    </div>
  );
}
