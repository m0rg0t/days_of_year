export type Mood = 'blue' | 'green' | 'red' | 'yellow';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateKeyForDayIndex(year: number, dayIndex1Based: number): string {
  // dayIndex1Based: 1..365/366
  const d = new Date(year, 0, dayIndex1Based);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const MONTH_SHORT_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

/**
 * Returns a map from 1-based day index to month short label
 * for the first day of each month in the given year.
 */
export function monthStartIndices(year: number): Map<number, string> {
  const result = new Map<number, string>();
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(year, m, 1);
    const index = dayOfYear(firstOfMonth);
    result.set(index, MONTH_SHORT_NAMES[m]);
  }
  return result;
}

/** Returns a BEM modifier class for a mood, e.g. `mood-blue`. */
export function moodClass(mood?: Mood): string {
  if (!mood) return '';
  return `mood-${mood}`;
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
