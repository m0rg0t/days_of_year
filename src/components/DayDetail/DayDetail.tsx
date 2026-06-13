import { Group, Header, Input } from '@vkontakte/vkui';
import { getQuoteForDate } from '../../quotes';
import { MOODS, MOOD_LABELS } from '../../utils';
import { hapticSuccess } from '../../haptics';
import type { DayData } from '../../vkYearStorage';
import './DayDetail.css';

interface DayDetailProps {
  selectedKey: string;
  selectedDayIndex: number;
  totalDays: number;
  isEditable: boolean;
  isToday: boolean;
  dayData: DayData;
  onUpdateDay: (key: string, patch: Partial<DayData>) => void;
}

export function DayDetail({
  selectedKey,
  selectedDayIndex,
  totalDays,
  isEditable,
  isToday,
  dayData,
  onUpdateDay,
}: DayDetailProps) {
  const handleMoodSet = (mood: typeof MOODS[number] | undefined) => {
    if (mood !== undefined) hapticSuccess();
    onUpdateDay(selectedKey, { mood });
  };

  // The day's phase, spoken in the grid's dot language: today is the accent
  // dot, an editable (past) day the filled dot, a future day the empty ring.
  const dayPhaseClass = isToday
    ? 'day-legend__dot--today'
    : isEditable
      ? 'day-legend__dot--filled'
      : 'day-detail__dot--future';

  return (
    <>
      <div className="vkui-div day-detail__entry">
        <div className="day-detail__meta">
          {/* date stays its own isolated text node (getByText) */}
          <span className="day-detail__date">{selectedKey}</span>

          {/* one dot in the grid's own language marks THIS day's phase
              (lived / today / ahead) — a per-day reading, not decoration */}
          <span
            className="day-detail__progress"
            aria-label={`День ${selectedDayIndex} из ${totalDays}${isToday ? ', сегодня' : isEditable ? ', прошедший' : ', будущий'}`}
          >
            <span className={`day-legend__dot ${dayPhaseClass}`} aria-hidden />
            <span className="day-detail__count" aria-hidden>
              {selectedDayIndex}<span className="day-detail__count-sep">/</span>{totalDays}
            </span>
          </span>
        </div>

        {/* bare editorial quote in real Russian « » (pseudo-elements keep
            the quote-block textContent equal to the quote string) */}
        <p className="day-detail__quote" data-testid="quote-block">
          {getQuoteForDate(selectedKey)}
        </p>
      </div>

      {isEditable ? (
        <>
          <Group header={<Header>Настроение</Header>}>
            <div className="vkui-div day-detail__mood-row">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  className={`day-detail__mood-btn ${dayData.mood === mood ? 'day-detail__mood-btn--active' : ''}`}
                  onClick={() => handleMoodSet(mood)}
                  aria-label={`Настроение: ${MOOD_LABELS[mood]}`}
                  aria-pressed={dayData.mood === mood}
                  data-testid={`mood-${mood}`}
                >
                  <span className={`day-detail__mood-dot day-detail__mood-dot--${mood}`} />
                  <span className="day-detail__mood-label">{MOOD_LABELS[mood]}</span>
                </button>
              ))}
              <button
                className="day-detail__mood-btn"
                onClick={() => handleMoodSet(undefined)}
                aria-label="Сбросить настроение"
                data-testid="mood-reset"
              >
                <span className="day-detail__mood-reset" aria-hidden>✕</span>
              </button>
            </div>
          </Group>

          <Group header={<Header>Вопрос дня</Header>}>
            <div className="vkui-div">
              <div className="day-detail__question small">
                {isToday ? 'Что сегодня было важным?' : 'Что было важным?'}
              </div>
              <Input
                placeholder="одно слово"
                value={dayData.word || ''}
                onChange={(e) => onUpdateDay(selectedKey, { word: e.target.value })}
              />
            </div>
          </Group>
        </>
      ) : (
        <Group header={<Header>След</Header>}>
          <div className="vkui-div">
            <div className="small">
              {dayData.mood ? `настроение: ${MOOD_LABELS[dayData.mood]}` : 'настроение: —'}
              {' · '}
              {dayData.word ? `слово: ${dayData.word}` : 'слово: —'}
            </div>
          </div>
        </Group>
      )}
    </>
  );
}
