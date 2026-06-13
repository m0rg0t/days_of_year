import { useState } from 'react';
import type { YearStats } from '../../stats';
import type { Badge } from '../../badges';
import { MOOD_LABELS, MOODS } from '../../utils';
import './StatsPanel.css';

interface StatsPanelProps {
  yearStats: YearStats;
  badges: Badge[];
  isDesktop: boolean;
}

export function StatsPanel({ yearStats, badges, isDesktop }: StatsPanelProps) {
  const [showStats, setShowStats] = useState(isDesktop);
  const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop);
  if (isDesktop !== prevIsDesktop) {
    setPrevIsDesktop(isDesktop);
    setShowStats(isDesktop);
  }

  return (
    <>
      <div className="vkui-div">
        <button
          className="stats-panel__toggle"
          onClick={() => setShowStats((s) => !s)}
          aria-expanded={showStats}
          data-testid="stats-toggle"
        >
          {showStats ? 'Скрыть статистику' : 'Показать статистику'}
        </button>
      </div>
      {showStats && (
        <div className="vkui-div">
          <div className="stats-panel__content" data-testid="stats-panel">
            <div className="stats-panel__row">
              <span>Заполнено дней</span>
              <strong>{yearStats.filledDays} / {yearStats.totalPastDays} ({yearStats.fillPercentage}%)</strong>
            </div>
            <div className="stats-panel__row">
              <span>Дней со словом</span>
              <strong>{yearStats.daysWithWord}</strong>
            </div>
            <div className="stats-panel__row">
              <span>Текущий стрик</span>
              <strong>{yearStats.currentStreak}</strong>
            </div>
            <div className="stats-panel__row">
              <span>Лучший стрик</span>
              <strong>{yearStats.longestStreak}</strong>
            </div>
            {yearStats.mostCommonMood && (
              <div className="stats-panel__row">
                <span>Частое настроение</span>
                <span className="stats-panel__mood-value">
                  <span
                    className={`stats-panel__mood-dot stats-panel__mood-dot--${yearStats.mostCommonMood}`}
                    aria-hidden
                  />
                  <span>{MOOD_LABELS[yearStats.mostCommonMood]}</span>
                </span>
              </div>
            )}
            {yearStats.filledDays > 0 && (
              <div
                className="stats-panel__mood-distribution"
                role="img"
                aria-label={`Распределение настроений: ${MOODS
                  .map((mood) => {
                    const pct = Math.round((yearStats.moodCounts[mood] / yearStats.filledDays) * 100);
                    return pct > 0 ? `${MOOD_LABELS[mood]} ${pct}%` : null;
                  })
                  .filter(Boolean)
                  .join(', ')}`}
              >
                {MOODS.map((mood) => {
                  const pct = yearStats.filledDays > 0
                    ? Math.round((yearStats.moodCounts[mood] / yearStats.filledDays) * 100)
                    : 0;
                  return pct > 0 ? (
                    <div
                      key={mood}
                      className={`stats-panel__mood-segment stats-panel__mood-segment--${mood}`}
                      style={{ width: `${pct}%` }}
                      title={`${MOOD_LABELS[mood]}: ${pct}%`}
                    />
                  ) : null;
                })}
              </div>
            )}
          </div>
          <div className="stats-panel__badges" data-testid="badges-row">
            {badges.map((badge) => {
              const current = yearStats[badge.threshold.field];
              const target = badge.threshold.value;
              return (
                <div
                  key={badge.id}
                  className={`stats-panel__badge ${badge.earned ? 'stats-panel__badge--earned' : 'stats-panel__badge--locked'}`}
                  title={`${badge.title}: ${badge.description}`}
                >
                  <span className="stats-panel__badge-emoji">{badge.emoji}</span>
                  <span className="stats-panel__badge-title">{badge.title}</span>
                  {!badge.earned && (
                    <span className="stats-panel__badge-progress">
                      {current}/{target}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
