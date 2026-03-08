import type { YearStats } from './stats';
import { MOODS, MOOD_LABELS } from './utils';
import type { DayData } from './vkYearStorage';

type ExportReportInput = {
  year: number;
  totalDays: number;
  todayIndex: number;
  days: Record<string, DayData>;
  dateKeys: string[];
  yearStats: YearStats;
};

export type FilledEntry = {
  dateKey: string;
  dayIndex: number;
  mood?: DayData['mood'];
  word?: string;
};

export function collectFilledEntries({
  totalDays,
  todayIndex,
  days,
  dateKeys,
}: Pick<ExportReportInput, 'totalDays' | 'todayIndex' | 'days' | 'dateKeys'>): FilledEntry[] {
  const scanLimit = todayIndex > 0 ? todayIndex : totalDays;
  const entries: FilledEntry[] = [];

  for (let i = 0; i < Math.min(scanLimit, dateKeys.length); i += 1) {
    const dateKey = dateKeys[i];
    const data = days[dateKey];
    if (!data || (!data.mood && !data.word)) continue;
    entries.push({
      dateKey,
      dayIndex: i + 1,
      mood: data.mood,
      word: data.word,
    });
  }

  return entries;
}

function escapeMarkdownCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ').trim();
}

export function buildYearMarkdownReport(input: ExportReportInput): string {
  const { year, totalDays, todayIndex, yearStats } = input;
  const entries = collectFilledEntries(input);
  const remainingDays = todayIndex > 0 ? Math.max(totalDays - todayIndex, 0) : 0;
  const generatedAt = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  const moodRows = MOODS
    .map((mood) => `| ${MOOD_LABELS[mood]} | ${yearStats.moodCounts[mood]} |`)
    .join('\n');

  const entryTable = entries.length > 0
    ? [
        '| Дата | День | Настроение | Слово |',
        '| --- | ---: | --- | --- |',
        ...entries.map((entry) => `| ${[
          entry.dateKey,
          String(entry.dayIndex),
          entry.mood ? MOOD_LABELS[entry.mood] : '—',
          entry.word ? escapeMarkdownCell(entry.word) : '—',
        ].join(' | ')} |`),
      ].join('\n')
    : '_Пока нет заполненных записей._';

  return [
    `# Дни года ${year}`,
    '',
    `Сформировано: ${generatedAt}`,
    '',
    '## Сводка',
    '',
    `- Сегодня: ${todayIndex > 0 ? `${todayIndex} из ${totalDays}` : `архивный год, всего ${totalDays} дней`}`,
    `- Заполнено дней: ${yearStats.filledDays} из ${yearStats.totalPastDays} (${yearStats.fillPercentage}%)`,
    `- Дней со словом: ${yearStats.daysWithWord}`,
    `- Текущий стрик: ${yearStats.currentStreak}`,
    `- Лучший стрик: ${yearStats.longestStreak}`,
    `- Частое настроение: ${yearStats.mostCommonMood ? MOOD_LABELS[yearStats.mostCommonMood] : '—'}`,
    `- Осталось дней: ${remainingDays}`,
    '',
    '## Настроения',
    '',
    '| Настроение | Дней |',
    '| --- | ---: |',
    moodRows,
    '',
    '## Записи',
    '',
    entryTable,
  ].join('\n');
}
