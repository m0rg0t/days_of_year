import './ExportCard.css';
import type { YearStats } from '../../stats';
import { MOOD_LABELS } from '../../utils';
import type { DayData } from '../../vkYearStorage';
import { moodClass } from '../../utils';
import type { GridLayout } from '../../gridLayout';
import { collectFilledEntries } from '../../exportReport';

export function ExportCard(props: {
  year: number;
  totalDays: number;
  todayIndex: number;
  gridLayout: GridLayout;
  days: Record<string, DayData>;
  dateKeys: string[];
  yearStats: YearStats;
}) {
  const { year, totalDays, todayIndex, gridLayout, days, dateKeys, yearStats } = props;
  const left = Math.max(0, totalDays - todayIndex);
  const recentEntries = collectFilledEntries({ totalDays, todayIndex, days, dateKeys })
    .filter((entry) => entry.word)
    .slice(-4)
    .reverse();
  const completionValue = todayIndex > 0 ? yearStats.fillPercentage : Math.round((yearStats.filledDays / totalDays) * 100);
  const leadStat = yearStats.mostCommonMood ? MOOD_LABELS[yearStats.mostCommonMood] : 'Без лидера';

  return (
    <div className="export-card">
      <div className="export-card__ambient export-card__ambient--blue" />
      <div className="export-card__ambient export-card__ambient--gold" />

      <div className="export-card__hero">
        <div className="export-card__header">
          <span className="export-card__eyebrow">Личный трекер года</span>
          <h2 className="export-card__title">Дни года {year}</h2>
          <p className="export-card__subtitle">Не просто календарь, а тепловая карта того, как проходит твой год.</p>
          <div className="export-card__meta">
            <span className="export-card__badge">Сегодня: {todayIndex > 0 ? `${todayIndex}/${totalDays}` : `архив · ${totalDays}`}</span>
            <span className="export-card__badge">Осталось: {todayIndex > 0 ? left : 0}</span>
            <span className="export-card__badge">Слов: {yearStats.daysWithWord}</span>
          </div>
        </div>

        <div className="export-card__progress">
          <div className="export-card__progress-label">Заполнено</div>
          <div className="export-card__progress-value">{completionValue}%</div>
          <div className="export-card__progress-caption">
            {yearStats.filledDays} из {yearStats.totalPastDays}
          </div>
        </div>
      </div>

      <div className="export-card__stats">
        <div className="export-card__stat">
          <span className="export-card__stat-label">Текущий стрик</span>
          <strong>{yearStats.currentStreak}</strong>
        </div>
        <div className="export-card__stat">
          <span className="export-card__stat-label">Лучший стрик</span>
          <strong>{yearStats.longestStreak}</strong>
        </div>
        <div className="export-card__stat">
          <span className="export-card__stat-label">Лидирующее настроение</span>
          <strong>{leadStat}</strong>
        </div>
      </div>

      <div className="export-card__body">
        <div className="export-card__grid-shell">
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

        <div className="export-card__side">
          <div className="export-card__legend">
            <div className="export-card__legend-title">Цвета настроений</div>
            <div className="export-card__legend-list">
              <span className="export-card__legend-item export-card__legend-item--blue">Спокойствие</span>
              <span className="export-card__legend-item export-card__legend-item--green">Энергия</span>
              <span className="export-card__legend-item export-card__legend-item--yellow">Радость</span>
              <span className="export-card__legend-item export-card__legend-item--red">Стресс</span>
            </div>
          </div>

          <div className="export-card__words">
            <div className="export-card__legend-title">Последние слова</div>
            {recentEntries.length > 0 ? (
              <div className="export-card__word-list">
                {recentEntries.map((entry) => (
                  <div key={entry.dateKey} className="export-card__word-card">
                    <span className="export-card__word-date">{entry.dateKey}</span>
                    <strong>{entry.word}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="export-card__empty">Добавь слова дня, и они появятся в экспорте.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
