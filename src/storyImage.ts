import type { DayData } from './vkYearStorage';

type StoryImageInput = {
  todayIndex: number;
  days: Record<string, DayData>;
  dateKeys: string[];
};

const MOOD_COLORS: Record<string, { fill: string; stroke: string }> = {
  blue: { fill: 'rgba(59, 130, 246, 0.9)', stroke: 'rgba(59, 130, 246, 1)' },
  green: { fill: 'rgba(34, 197, 94, 0.9)', stroke: 'rgba(34, 197, 94, 1)' },
  red: { fill: 'rgba(239, 68, 68, 0.9)', stroke: 'rgba(239, 68, 68, 1)' },
  yellow: { fill: 'rgba(234, 179, 8, 0.9)', stroke: 'rgba(234, 179, 8, 1)' },
};

export function createStoryImageDataUrl({
  todayIndex,
  days,
  dateKeys,
}: StoryImageInput): string | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = 720;
  const height = 1280;
  const deviceRatio = typeof window === 'undefined' ? 2 : window.devicePixelRatio || 2;
  const scale = Math.min(2, deviceRatio);

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#f5f6f8');
  background.addColorStop(1, '#eef2f6');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.82, height * 0.08, 0, width * 0.82, height * 0.08, 260);
  glow.addColorStop(0, 'rgba(39, 135, 245, 0.16)');
  glow.addColorStop(1, 'rgba(39, 135, 245, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const padding = 56;
  ctx.fillStyle = '#1a1a1e';
  ctx.font = '700 44px "Segoe UI", "SF Pro Display", -apple-system, Arial, sans-serif';
  ctx.fillText('Дни года', padding, 110);

  ctx.fillStyle = '#6d7885';
  ctx.font = '400 22px "Segoe UI", "SF Pro Text", -apple-system, Arial, sans-serif';
  ctx.fillText('«Этот день — один из твоих 365.»', padding, 148);

  const cols = 20;
  const cell = 18;
  const gap = 8;
  const gridWidth = cols * cell + (cols - 1) * gap;
  const gridX = Math.round((width - gridWidth) / 2);
  const gridY = 260;

  for (let i = 0; i < dateKeys.length; i += 1) {
    const dayIndex = i + 1;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const centerX = gridX + col * (cell + gap) + cell / 2;
    const centerY = gridY + row * (cell + gap) + cell / 2;
    const mood = days[dateKeys[i]]?.mood;
    const filled = todayIndex > 0 && dayIndex < todayIndex;
    const isToday = todayIndex > 0 && dayIndex === todayIndex;

    const palette = mood ? MOOD_COLORS[mood] : null;
    const fill = palette?.fill ?? (filled ? 'rgba(39, 135, 245, 0.28)' : 'rgba(26, 26, 30, 0.06)');
    const stroke = palette?.stroke ?? (filled ? 'rgba(39, 135, 245, 0.5)' : 'rgba(26, 26, 30, 0.14)');

    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.arc(centerX, centerY, cell / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isToday) {
      ctx.beginPath();
      ctx.strokeStyle = '#2787f5';
      ctx.lineWidth = 3;
      ctx.arc(centerX, centerY, cell / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/png');
}
