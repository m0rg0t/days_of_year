import { Div, SimpleCell } from '@vkontakte/vkui';
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
      <Div className="year-nav">
        <button
          className="year-nav__button"
          onClick={() => onChangeYear(viewYear - 1)}
          aria-label="prev-year"
        >
          ←
        </button>
        <span className="year-nav__label">{viewYear}</span>
        <button
          className="year-nav__button"
          onClick={() => onChangeYear(viewYear + 1)}
          disabled={viewYear >= currentYear}
          aria-label="next-year"
        >
          →
        </button>
      </Div>
      {isCurrentYear && (
        <>
          <SimpleCell>
            Сегодня: {todayIndex}/{totalDays} · Осталось: {left}
          </SimpleCell>
          <div className="year-nav__progress">
            <div className="year-nav__progress-fill" style={{ width: `${(todayIndex / totalDays) * 100}%` }} />
          </div>
        </>
      )}
    </>
  );
}
