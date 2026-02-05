import './YearNav.css';

interface YearNavProps {
  viewYear: number;
  currentYear: number;
  todayIndex: number;
  totalDays: number;
  onChangeYear: (year: number) => void;
}

export function YearNav({ viewYear, currentYear, todayIndex, totalDays, onChangeYear }: YearNavProps) {
  const isCurrentYear = viewYear === currentYear;
  const left = isCurrentYear ? Math.max(0, totalDays - todayIndex) : 0;

  return (
    <>
      <div className="vkui-div year-nav">
        <button
          className="year-nav__button"
          onClick={() => onChangeYear(viewYear - 1)}
          aria-label="prev-year"
        >
          <span aria-hidden>←</span>
        </button>
        <span className="year-nav__label">{viewYear}</span>
        <button
          className="year-nav__button"
          onClick={() => onChangeYear(viewYear + 1)}
          disabled={viewYear >= currentYear}
          aria-label="next-year"
        >
          <span aria-hidden>→</span>
        </button>
      </div>
      {isCurrentYear && (
        <>
          <div className="year-nav__meta">
            <span className="year-nav__chip">Сегодня: {todayIndex}/{totalDays}</span>
            <span className="year-nav__chip">Осталось: {left}</span>
          </div>
          <div className="year-nav__progress">
            <div className="year-nav__progress-fill" style={{ width: `${(todayIndex / totalDays) * 100}%` }} />
          </div>
        </>
      )}
    </>
  );
}
