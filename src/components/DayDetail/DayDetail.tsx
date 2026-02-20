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

  return (
    <>
      <div className="vkui-div">
        <div className="day-detail__pill">
          <strong className="day-detail__pill-label">День:</strong>
          <span>{selectedKey}</span>
          <span className="small">({selectedDayIndex}/{totalDays})</span>
        </div>
        <div className="day-detail__quote" data-testid="quote-block">
          {getQuoteForDate(selectedKey)}
        </div>
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
                  aria-label={`mood-${mood}`}
                >
                  <span className={`day-detail__mood-dot day-detail__mood-dot--${mood}`} />
                  <span className="day-detail__mood-label">{MOOD_LABELS[mood]}</span>
                </button>
              ))}
              <button
                className="day-detail__mood-btn"
                onClick={() => handleMoodSet(undefined)}
                aria-label="mood-reset"
              >
                <span className="day-detail__mood-reset">✕</span>
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
              {dayData.mood ? `настроение: ${dayData.mood}` : 'настроение: —'}
              {' · '}
              {dayData.word ? `слово: ${dayData.word}` : 'слово: —'}
            </div>
          </div>
        </Group>
      )}
    </>
  );
}
