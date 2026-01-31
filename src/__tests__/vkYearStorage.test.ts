import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vkontakte/vk-bridge', () => {
  return {
    default: {
      send: vi.fn(),
    },
  };
});

import bridge from '@vkontakte/vk-bridge';
import { createVkYearBlobWriter, loadYearBlobFromVk, yearKey } from '../vkYearStorage';

const mockSend = vi.mocked(bridge.send);

describe('vkYearStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSend.mockReset();
  });

  it('yearKey format', () => {
    expect(yearKey(2026)).toBe('doy:2026');
  });

  it('loadYearBlobFromVk returns parsed blob', async () => {
    mockSend.mockResolvedValue({
      keys: [{ key: 'doy:2026', value: JSON.stringify({ '2026-01-01': { word: 'x' } }) }],
    } as Awaited<ReturnType<typeof bridge.send>>);

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('x');
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

  it('writer debounces and writes one key', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    const w = createVkYearBlobWriter(2026);
    w.setYear({ '2026-01-01': { word: 'a' } });
    w.setYear({ '2026-01-01': { word: 'b' } });

    // not yet
    expect(mockSend.mock.calls.length).toBe(0);

    vi.advanceTimersByTime(650);
    // allow promise to resolve
    await vi.runAllTicks();

    expect(mockSend.mock.calls.length).toBe(1);
    expect(mockSend.mock.calls[0][0]).toBe('VKWebAppStorageSet');
    expect((mockSend.mock.calls[0][1] as { key: string }).key).toBe('doy:2026');
  });
});
