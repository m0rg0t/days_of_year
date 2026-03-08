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
    expect(yearKey(2026)).toBe('doy:2026');
  });

  it('monthKey format with zero-padding', () => {
    expect(monthKey(2026, 1)).toBe('doy:2026:01');
    expect(monthKey(2026, 12)).toBe('doy:2026:12');
  });

  it('loadYearBlobFromVk returns parsed monthly chunks', async () => {
    mockSend.mockResolvedValue({
      keys: [
        { key: 'doy:2026:01', value: JSON.stringify({ '2026-01-01': { word: 'jan' } }) },
        { key: 'doy:2026:03', value: JSON.stringify({ '2026-03-15': { mood: 'great' } }) },
        { key: 'doy:2026', value: '' },
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
    expect(keys).toContain('doy:2026:01');
    expect(keys).toContain('doy:2026:12');
    expect(keys).toContain('doy:2026');
  });

  it('loadYearBlobFromVk falls back to legacy key when no monthly data', async () => {
    mockSend.mockResolvedValue({
      keys: [
        { key: 'doy:2026', value: JSON.stringify({ '2026-01-01': { word: 'legacy' } }) },
      ],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('legacy');
  });

  it('loadYearBlobFromVk prefers monthly data over legacy', async () => {
    mockSend.mockResolvedValue({
      keys: [
        { key: 'doy:2026:01', value: JSON.stringify({ '2026-01-01': { word: 'monthly' } }) },
        { key: 'doy:2026', value: JSON.stringify({ '2026-01-01': { word: 'legacy' } }) },
      ],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('monthly');
  });

  it('loadYearBlobFromVk ignores non-object JSON', async () => {
    mockSend.mockResolvedValue({
      keys: [{ key: 'doy:2026', value: JSON.stringify('oops') }],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('loadYearBlobFromVk ignores null JSON', async () => {
    mockSend.mockResolvedValue({
      keys: [{ key: 'doy:2026', value: 'null' }],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('loadYearBlobFromVk returns {} on error', async () => {
    mockSend.mockRejectedValue(new Error('fail'));
    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('writer debounces and writes monthly chunks', async () => {
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

    // 12 month writes + 1 legacy clear
    expect(mockSend.mock.calls.length).toBe(13);

    const callArgs = mockSend.mock.calls.map((c) => ({
      method: c[0],
      key: (c[1] as { key: string }).key,
      value: (c[1] as { value: string }).value,
    }));

    // Monthly chunk for January
    const janCall = callArgs.find((c) => c.key === 'doy:2026:01');
    expect(janCall).toBeDefined();
    expect(JSON.parse(janCall!.value)).toEqual({ '2026-01-01': { word: 'b' } });

    // Monthly chunk for March
    const marCall = callArgs.find((c) => c.key === 'doy:2026:03');
    expect(marCall).toBeDefined();
    expect(JSON.parse(marCall!.value)).toEqual({ '2026-03-15': { mood: 'great' } });

    // Empty month is cleared
    const febCall = callArgs.find((c) => c.key === 'doy:2026:02');
    expect(febCall).toBeDefined();
    expect(febCall!.value).toBe('');

    // Legacy key cleared
    const legacyClear = callArgs.find((c) => c.key === 'doy:2026');
    expect(legacyClear).toBeDefined();
    expect(legacyClear!.value).toBe('');
  });

  it('writer clears legacy key even with single month', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    const w = createVkYearBlobWriter(2026);
    w.setYear({ '2026-05-10': { word: 'hello' } });

    vi.advanceTimersByTime(650);
    await vi.runAllTicks();

    // 12 month writes + 1 legacy clear
    expect(mockSend.mock.calls.length).toBe(13);

    const keys = mockSend.mock.calls.map((c) => (c[1] as { key: string }).key);
    expect(keys).toContain('doy:2026:05');
    expect(keys).toContain('doy:2026');
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

  it('writer clears removed months in VK Storage', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    const w = createVkYearBlobWriter(2026);
    w.setYear({});

    vi.advanceTimersByTime(650);
    await vi.runAllTicks();

    const janCall = mockSend.mock.calls.find((call) => (call[1] as { key: string }).key === 'doy:2026:01');
    expect(janCall).toBeDefined();
    expect((janCall![1] as { value: string }).value).toBe('');
  });
});
