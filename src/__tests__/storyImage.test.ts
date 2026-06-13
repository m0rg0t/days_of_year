import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoryImageDataUrl } from '../storyImage';
import { dateKeyForDayIndex } from '../utils';
import type { DayData } from '../vkYearStorage';

/**
 * jsdom does not implement the canvas 2D context, so we install a recording
 * fake. It captures every drawing call we care about (arcs, fills, strokes)
 * which lets us assert that the mood / filled / today branches all execute.
 */
type ArcCall = { x: number; y: number; r: number };

interface FakeContext {
  arcs: ArcCall[];
  strokeStyles: string[];
  fillStyles: string[];
}

function installFakeCanvas(): FakeContext {
  const record: FakeContext = { arcs: [], strokeStyles: [], fillStyles: [] };

  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    scale: vi.fn(),
    imageSmoothingEnabled: false,
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn((x: number, y: number, r: number) => record.arcs.push({ x, y, r })),
    fill: vi.fn(() => record.fillStyles.push(String(ctx.fillStyle))),
    stroke: vi.fn(() => record.strokeStyles.push(String(ctx.strokeStyle))),
    set fillStyle(v: string) { this._fillStyle = v; },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(v: string) { this._strokeStyle = v; },
    get strokeStyle() { return this._strokeStyle; },
    _fillStyle: '',
    _strokeStyle: '',
    font: '',
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as ReturnType<HTMLCanvasElement['getContext']>,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,FAKE',
  );

  return record;
}

// Real 'YYYY-MM-DD' keys (matching production), sequential from Jan 1.
function makeKeys(n: number): string[] {
  return Array.from({ length: n }, (_, i) => dateKeyForDayIndex(2026, i + 1));
}

describe('createStoryImageDataUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the 2D context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const url = createStoryImageDataUrl({ todayIndex: 10, days: {}, dateKeys: makeKeys(20) });
    expect(url).toBeNull();
  });

  it('returns a PNG data URL and draws one arc per day', () => {
    const record = installFakeCanvas();
    const dateKeys = makeKeys(40);
    const url = createStoryImageDataUrl({ todayIndex: 20, days: {}, dateKeys });

    expect(url).toBe('data:image/png;base64,FAKE');
    // One arc per day, plus one extra ring arc for "today".
    expect(record.arcs.length).toBe(dateKeys.length + 1);
  });

  it('exercises mood, filled, and future branches', () => {
    const record = installFakeCanvas();
    const dateKeys = makeKeys(30);
    const days: Record<string, DayData> = {
      [dateKeys[0]]: { mood: 'blue' },
      [dateKeys[1]]: { mood: 'green' },
      [dateKeys[2]]: { mood: 'red' },
      [dateKeys[3]]: { mood: 'yellow' },
    };
    const url = createStoryImageDataUrl({ todayIndex: 15, days, dateKeys });

    expect(url).toBe('data:image/png;base64,FAKE');
    // Mood fills should appear among the recorded fill styles.
    const fills = record.fillStyles.join('|');
    expect(fills).toMatch(/59, 130, 246/); // blue
    expect(fills).toMatch(/34, 197, 94/); // green
    expect(fills).toMatch(/239, 68, 68/); // red
    expect(fills).toMatch(/234, 179, 8/); // yellow
    // Non-mood days exercise the filled (past) and empty (future) defaults.
    expect(fills).toMatch(/39, 135, 245, 0\.28/); // filled past day
    expect(fills).toMatch(/26, 26, 30, 0\.06/); // empty future day
  });

  it('renders an archived year (todayIndex 0) as fully lived — every day filled, no today ring', () => {
    const record = installFakeCanvas();
    const dateKeys = makeKeys(25);
    const url = createStoryImageDataUrl({ todayIndex: 0, days: {}, dateKeys });

    expect(url).toBe('data:image/png;base64,FAKE');
    // No "today" ring -> exactly one arc per day.
    expect(record.arcs.length).toBe(dateKeys.length);
    const fills = record.fillStyles.join('|');
    // A past/archived year is all "lived": the filled colour is used...
    expect(fills).toMatch(/39, 135, 245, 0\.28/);
    // ...and the empty/future colour never appears.
    expect(fills).not.toMatch(/26, 26, 30, 0\.06/);
  });
});
