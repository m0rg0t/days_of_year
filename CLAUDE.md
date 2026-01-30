# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

**Days of Year** (Дни года) is a VK Mini App that visualizes a calendar year as an adaptive grid of circular dots. Each dot represents a day: past days are filled, the current day is highlighted, and future days are empty. Users can set a mood color and a one-word note for the current day. Data persists via VK Storage (primary) with localStorage fallback.

## Tech Stack

- **React 19** with TypeScript (~5.9)
- **Vite 7** for bundling and dev server
- **Vitest** with `@testing-library/react` for testing
- **@vkontakte/vk-bridge** for VK Mini Apps integration (storage, ads, sharing)
- **html2canvas** for PNG export
- **ESLint** (flat config) with typescript-eslint and react-hooks plugins

## Project Structure

```
src/
  App.tsx            # Main component — all UI, state, and lifecycle logic
  app.css            # All application styles (dark theme, glassmorphism)
  main.tsx           # React entry point
  gridLayout.ts      # Responsive grid layout algorithm (ResizeObserver-driven)
  localStore.ts      # localStorage persistence wrapper
  vkYearStorage.ts   # VK Storage sync (debounced single-blob-per-year)
  vkAds.ts           # VK banner ad show/hide helpers
  utils.ts           # Date utilities, leap year, JSON export
  __tests__/         # Test files mirroring source modules
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally
npm run lint         # ESLint
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once (no watch)
npm run test:coverage  # Run tests with V8 coverage report
```

## Testing

- Tests live in `src/__tests__/` and follow the pattern `<module>.test.ts(x)`.
- Test environment: jsdom (configured in `vitest.config.ts`).
- `vitest.setup.ts` mocks `ResizeObserver` (absent from jsdom).
- External dependencies (`vk-bridge`, `html2canvas`) are mocked in tests.
- **Coverage thresholds** (enforced in CI): 90% lines, 90% functions, 80% branches, 90% statements.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR:
1. `npm ci`
2. `npm run build`
3. `npm run test:coverage`

All steps must pass.

## Architecture Notes

- **Single-component app**: `App.tsx` contains all UI and state management using React hooks.
- **Data model**: `Store` holds `{ version, year, days }` where `days` is a `Record<string, DayData>` keyed by `YYYY-MM-DD`.
- **Storage strategy**: On mount, data hydrates from VK Storage (merged with localStorage). All updates mirror to both stores. VK Storage writes are debounced (600ms).
- **Grid layout**: `computeBestLayout()` tries column counts 14-26 and picks the one maximizing cell size within available viewport. Gap tightens on narrow screens (<420px).
- **Exports**: PNG via html2canvas (shared to VK wall if available, otherwise downloaded), JSON via blob download.

## Coding Conventions

- TypeScript strict mode enabled.
- Functional React with hooks only (no class components).
- CSS custom properties (`--cols`, `--cell`, `--gap`) set by JS for responsive grid.
- All VK Bridge calls are wrapped with error handling and graceful no-ops for non-VK environments.
- UI language is Russian.
