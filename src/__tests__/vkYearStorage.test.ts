import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vkontakte/vk-bridge', () => {
  return {
    default: {
      send: vi.fn(),
    },
  };
});

import bridge from '@vkontakte/vk-bridge';
import { createVkYearBlobWriter, loadYearBlobFromVk, monthKey, yearKey } from '../vkYearStorage';

const mockSend = vi.mocked(bridge.send);

describe('vkYearStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSend.mockReset();
  });

  it('yearKey format', () => {
    expect(yearKey(2026)).toBe('doy_2026');
  });

  it('monthKey format with zero-padding', () => {
    expect(monthKey(2026, 1)).toBe('doy_2026_01');
    expect(monthKey(2026, 12)).toBe('doy_2026_12');
  });

  it('keys use only VK-Storage-legal characters (no colons)', () => {
    // VK Storage rejects keys outside [a-zA-Z0-9_-]; a colon made every write fail.
    const legal = /^[a-zA-Z0-9_-]{1,100}$/;
    expect(yearKey(2026)).toMatch(legal);
    for (let m = 1; m <= 12; m++) {
      expect(monthKey(2026, m)).toMatch(legal);
    }
  });

  it('loadYearBlobFromVk returns parsed monthly chunks', async () => {
    mockSend.mockResolvedValue({
      keys: [
        { key: 'doy_2026_01', value: JSON.stringify({ '2026-01-01': { word: 'jan' } }) },
        { key: 'doy_2026_03', value: JSON.stringify({ '2026-03-15': { mood: 'great' } }) },
        { key: 'doy_2026', value: '' },
      ],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('jan');
    expect(res['2026-03-15']?.mood).toBe('great');
  });

  it('loadYearBlobFromVk requests 13 keys (12 monthly + 1 legacy)', async () => {
    mockSend.mockResolvedValue({
      keys: [],
    } as Awaited<ReturnType<typeof bridge.send>>);

    await loadYearBlobFromVk(2026);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0];
    expect(call[0]).toBe('VKWebAppStorageGet');
    const keys = (call[1] as { keys: string[] }).keys;
    expect(keys).toHaveLength(13);
    expect(keys).toContain('doy_2026_01');
    expect(keys).toContain('doy_2026_12');
    expect(keys).toContain('doy_2026');
  });

  it('loadYearBlobFromVk falls back to legacy key when no monthly data', async () => {
    mockSend.mockResolvedValue({
      keys: [
        { key: 'doy_2026', value: JSON.stringify({ '2026-01-01': { word: 'legacy' } }) },
      ],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('legacy');
  });

  it('loadYearBlobFromVk prefers monthly data over legacy', async () => {
    mockSend.mockResolvedValue({
      keys: [
        { key: 'doy_2026_01', value: JSON.stringify({ '2026-01-01': { word: 'monthly' } }) },
        { key: 'doy_2026', value: JSON.stringify({ '2026-01-01': { word: 'legacy' } }) },
      ],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('monthly');
  });

  it('loadYearBlobFromVk ignores non-object JSON', async () => {
    mockSend.mockResolvedValue({
      keys: [{ key: 'doy_2026', value: JSON.stringify('oops') }],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('loadYearBlobFromVk ignores null JSON', async () => {
    mockSend.mockResolvedValue({
      keys: [{ key: 'doy_2026', value: 'null' }],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('loadYearBlobFromVk returns {} on error', async () => {
    mockSend.mockRejectedValue(new Error('fail'));
    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('writer debounces and writes only the months with data (+ a one-time legacy clear)', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    const w = createVkYearBlobWriter(2026);
    w.setYear({
      '2026-01-01': { word: 'a' },
      '2026-03-15': { mood: 'great' },
    });
    w.setYear({
      '2026-01-01': { word: 'b' },
      '2026-03-15': { mood: 'great' },
    });

    // not yet
    expect(mockSend.mock.calls.length).toBe(0);

    vi.advanceTimersByTime(650);
    await vi.runAllTicks();

    // Jan + Mar (the only months with data) + 1 legacy clear = 3 writes, NOT 13.
    expect(mockSend.mock.calls.length).toBe(3);

    const callArgs = mockSend.mock.calls.map((c) => ({
      key: (c[1] as { key: string }).key,
      value: (c[1] as { value: string }).value,
    }));

    const janCall = callArgs.find((c) => c.key === 'doy_2026_01');
    expect(janCall).toBeDefined();
    expect(JSON.parse(janCall!.value)).toEqual({ '2026-01-01': { word: 'b' } });

    const marCall = callArgs.find((c) => c.key === 'doy_2026_03');
    expect(marCall).toBeDefined();
    expect(JSON.parse(marCall!.value)).toEqual({ '2026-03-15': { mood: 'great' } });

    // Empty, never-written months are NOT written (no wasted requests).
    expect(callArgs.find((c) => c.key === 'doy_2026_02')).toBeUndefined();

    // Legacy key cleared once.
    const legacyClear = callArgs.find((c) => c.key === 'doy_2026');
    expect(legacyClear).toBeDefined();
    expect(legacyClear!.value).toBe('');
  });

  it('writer re-sends only the months that changed on the next flush', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    const w = createVkYearBlobWriter(2026);
    w.setYear({ '2026-01-01': { word: 'a' }, '2026-03-15': { mood: 'great' } });
    await vi.advanceTimersByTimeAsync(650);
    expect(mockSend.mock.calls.length).toBe(3); // Jan, Mar, legacy

    mockSend.mockClear();

    // Only January changed; March is identical and the legacy key is already cleared.
    w.setYear({ '2026-01-01': { word: 'b' }, '2026-03-15': { mood: 'great' } });
    await vi.advanceTimersByTimeAsync(650);

    const keys = mockSend.mock.calls.map((c) => (c[1] as { key: string }).key);
    expect(keys).toEqual(['doy_2026_01']);
  });

  it('writer reports saving and saved states', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);
    const onStateChange = vi.fn();

    const w = createVkYearBlobWriter(2026, { onStateChange });
    w.setYear({ '2026-05-10': { word: 'hello' } });

    expect(onStateChange).toHaveBeenCalledWith({ status: 'saving' });

    vi.advanceTimersByTime(650);
    await vi.runAllTicks();
    await Promise.resolve();

    expect(onStateChange.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ status: 'saved' }));
  });

  it('writer reports error when a write fails (and keeps the month dirty for retry)', async () => {
    const onStateChange = vi.fn();
    const w = createVkYearBlobWriter(2026, { onStateChange });

    // First flush: the month write rejects.
    mockSend.mockRejectedValue(new Error('rate limit'));
    w.setYear({ '2026-05-10': { word: 'hello' } });
    vi.advanceTimersByTime(650);
    await vi.runAllTicks();
    await Promise.resolve();
    expect(onStateChange.mock.calls.at(-1)?.[0]).toEqual({ status: 'error' });

    // Second flush with the SAME data must retry May (it was never marked written).
    mockSend.mockReset();
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);
    w.setYear({ '2026-05-10': { word: 'hello' } });
    vi.advanceTimersByTime(650);
    await vi.runAllTicks();
    const keys = mockSend.mock.calls.map((c) => (c[1] as { key: string }).key);
    expect(keys).toContain('doy_2026_05');
  });

  it('writer clears a month in VK Storage after its data is removed', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    const w = createVkYearBlobWriter(2026);
    // Write January first…
    w.setYear({ '2026-01-05': { word: 'x' } });
    await vi.advanceTimersByTimeAsync(650);
    expect(mockSend.mock.calls.some((c) => (c[1] as { key: string }).key === 'doy_2026_01')).toBe(true);

    mockSend.mockClear();

    // …then remove it — January should be cleared with an empty value.
    w.setYear({});
    await vi.advanceTimersByTimeAsync(650);

    const janClear = mockSend.mock.calls.find((c) => (c[1] as { key: string }).key === 'doy_2026_01');
    expect(janClear).toBeDefined();
    expect((janClear![1] as { value: string }).value).toBe('');
  });
});
