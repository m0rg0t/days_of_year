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

describe('vkYearStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (bridge.send as any).mockReset();
  });

  it('yearKey format', () => {
    expect(yearKey(2026)).toBe('doy:2026');
  });

  it('loadYearBlobFromVk returns parsed blob', async () => {
    (bridge.send as any).mockResolvedValue({
      keys: [{ key: 'doy:2026', value: JSON.stringify({ '2026-01-01': { word: 'x' } }) }],
    });

    const res = await loadYearBlobFromVk(2026);
    expect(res['2026-01-01']?.word).toBe('x');
  });

  it('loadYearBlobFromVk ignores non-object JSON', async () => {
    (bridge.send as any).mockResolvedValue({
      keys: [{ key: 'doy:2026', value: JSON.stringify('oops') }],
    });

    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('loadYearBlobFromVk ignores null JSON', async () => {
    (bridge.send as any).mockResolvedValue({
      keys: [{ key: 'doy:2026', value: 'null' }],
    });

    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('loadYearBlobFromVk returns {} on error', async () => {
    (bridge.send as any).mockRejectedValue(new Error('fail'));
    const res = await loadYearBlobFromVk(2026);
    expect(res).toEqual({});
  });

  it('writer debounces and writes one key', async () => {
    (bridge.send as any).mockResolvedValue({ result: true });

    const w = createVkYearBlobWriter(2026);
    w.setYear({ '2026-01-01': { word: 'a' } });
    w.setYear({ '2026-01-01': { word: 'b' } });

    // not yet
    expect((bridge.send as any).mock.calls.length).toBe(0);

    vi.advanceTimersByTime(650);
    // allow promise to resolve
    await vi.runAllTicks();

    expect((bridge.send as any).mock.calls.length).toBe(1);
    expect((bridge.send as any).mock.calls[0][0]).toBe('VKWebAppStorageSet');
    expect((bridge.send as any).mock.calls[0][1].key).toBe('doy:2026');
  });
});
