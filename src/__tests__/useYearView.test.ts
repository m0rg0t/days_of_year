import { createElement, StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ load: vi.fn(), write: vi.fn() }));
vi.mock('../vkYearStorage', () => ({ loadYearBlobWithStatusFromVk: storage.load, createVkYearBlobWriter: () => ({ setYear: storage.write }) }));
import { useYearView } from '../hooks/useYearView';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-30T12:00:00Z')); localStorage.clear(); storage.load.mockReset(); storage.write.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('never writes cloud after an unconfirmed read', async () => {
  storage.load.mockResolvedValue({ days: {}, confirmed: false });
  const { result } = renderHook(() => useYearView());
  await act(async () => {});
  act(() => result.current.updateDay('2026-01-30', { word: 'local' }));
  expect(result.current.yearDays['2026-01-30']).toEqual({ word: 'local' });
  expect(storage.write).not.toHaveBeenCalled();
  expect(result.current.vkSyncState.status).toBe('error');
});

it('retains a pending edit and untouched cloud history before writing', async () => {
  let resolve!: (value: unknown) => void;
  storage.load.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { result } = renderHook(() => useYearView(), { wrapper: ({ children }) => createElement(StrictMode, null, children) });
  act(() => result.current.updateDay('2026-01-30', { word: 'new' }));
  expect(storage.write).not.toHaveBeenCalled();
  await act(async () => { resolve({ confirmed: true, days: { '2026-01-01': { word: 'cloud' }, '2026-01-30': { word: 'old' } } }); });
  expect(storage.write).toHaveBeenCalledWith({ '2026-01-01': { word: 'cloud' }, '2026-01-30': { word: 'new' } });
});

it('ignores a stale hydration response after year navigation', async () => {
  let resolve!: (value: unknown) => void;
  storage.load.mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValue({ confirmed: true, days: {} });
  const { result } = renderHook(() => useYearView());
  await act(async () => { result.current.changeYear(2025); });
  await act(async () => { resolve({ confirmed: true, days: { '2026-01-01': { word: 'stale' } } }); });
  expect(result.current.viewYear).toBe(2025);
  expect(result.current.yearDays).toEqual({});
  expect(storage.write).not.toHaveBeenCalled();
});
