import { Div, Group, Header, Input } from '@vkontakte/vkui';
import { getQuoteForDate } from '../../quotes';
import type { Mood } from '../../utils';
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
  return (
    <>
      <Div>
        <div className="day-detail__pill">
          <strong style={{ minWidth: 96 }}>День:</strong>
          <span>{selectedKey}</span>
          <span className="small">({selectedDayIndex}/{totalDays})</span>
        </div>
        <div className="day-detail__quote" data-testid="quote-block">
          {getQuoteForDate(selectedKey)}
        </div>
      </Div>

      {isEditable ? (
        <>
          <Group header={<Header>Настроение</Header>}>
            <Div className="day-detail__mood-row">
              {(['blue', 'green', 'red', 'yellow'] as const).map((mood: Mood) => (
                <button
                  key={mood}
                  className={`day-detail__mood-btn ${dayData.mood === mood ? 'day-detail__mood-btn--active' : ''}`}
                  onClick={() => onUpdateDay(selectedKey, { mood })}
                  aria-label={`mood-${mood}`}
                >
                  <span className={`day-detail__mood-dot day-detail__mood-dot--${mood}`} />
                </button>
              ))}
              <button
                className="day-detail__mood-btn"
                onClick={() => onUpdateDay(selectedKey, { mood: undefined })}
                aria-label="mood-reset"
              >
                <span style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>✕</span>
              </button>
            </Div>
          </Group>

          <Group header={<Header>Вопрос дня</Header>}>
            <Div>
              <div className="small" style={{ marginBottom: 8 }}>
                {isToday ? 'Что сегодня было важным?' : 'Что было важным?'}
              </div>
              <Input
                placeholder="одно слово"
                value={dayData.word || ''}
                onChange={(e) => onUpdateDay(selectedKey, { word: e.target.value })}
              />
            </Div>
          </Group>
        </>
      ) : (
        <Group header={<Header>След</Header>}>
          <Div>
            <div className="small">
              {dayData.mood ? `настроение: ${dayData.mood}` : 'настроение: —'}
              {' · '}
              {dayData.word ? `слово: ${dayData.word}` : 'слово: —'}
            </div>
          </Div>
        </Group>
      )}
    </>
  );
}
