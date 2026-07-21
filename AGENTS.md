# AGENTS.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

**Days of Year** (Дни года) is a VK Mini App that visualizes a calendar year as an adaptive grid of circular dots. Each dot represents a day: past days are filled, the current day is highlighted, and future days are empty. Users can set a mood color and a one-word note for any past or current day. Data persists via VK Storage (primary) with localStorage fallback.

### Key Features
- **Mood & word editing** for any past or current day (future days are read-only)
- **Year navigation** — browse previous years with ←/→ buttons
- **Daily quote** — deterministic motivational quote for each date
- **Month separators** — short month labels above the first dot of each month
- **Year statistics** — collapsible panel with fill %, streaks, mood distribution
- **Badges** — 6 achievement badges (first day, week streak, month, 100 days, half year, full year)

## Tech Stack

- **React 19** with TypeScript (~5.9)
- **@vkontakte/vkui 7** — VK's component library (provides the `ConfigProvider`/`AppRoot`/`Group`/`Button`/modal primitives and the `--vkui--*` design tokens that drive VK-native **light and dark** color schemes)
- **Vite 7** for bundling and dev server
- **Vitest** with `@testing-library/react` for testing
- **@vkontakte/vk-bridge** for VK Mini Apps integration (storage, ads, sharing, haptics, story share)
- **html2canvas** for PNG export
- **ESLint** (flat config) with typescript-eslint and react-hooks plugins

## Project Structure

The app is component-based: `App.tsx` is a thin composition root that wires
hooks (state/layout/theme) into presentational components under `components/`.

```
src/
  App.tsx               # Composition root — providers, hero, calendar + sidebar layout, modal
  main.tsx              # React entry point
  components/
    AppCalendarSection/ # Calendar Group: today/density controls, hint, DayGrid, mood legend, mobile month-nav + day-shortcut
    AppSidebar/         # Desktop sidebar / mobile stacked groups (DayDetail, StatsPanel, ExportPanel)
    AppDayModal/        # Mobile day-detail modal wrapping DayDetail
    DayGrid/            # The dot grid (hero element) + its CSS
    DayDetail/          # Day pill, daily quote, mood buttons, word input + its CSS
    StatsPanel/         # Collapsible year stats + badges row + its CSS
    YearNav/            # Year arrows, label, progress bar + its CSS
    ExportPanel/        # PNG / Markdown / Share controls + Markdown preview + its CSS
    ExportCard/         # Standalone fixed-width card rendered to PNG via html2canvas + its CSS
  hooks/
    useYearView.ts      # All year/day state (selection, store, VK sync, stats, badges)
    useGridLayout.ts    # ResizeObserver-driven grid sizing (delegates to gridLayout.ts)
    useVkTheme.ts       # VK color-scheme detection + body mirror; inits bridge, banner ad (via vkBridgeService)
    useIsDesktop.ts     # window-width breakpoint (960px) for the two-column layout
  styles/
    global.css          # body, design tokens (radius scale, mood palette), focus-visible, reduced-motion
    layout.css          # app-layout grid, hero, calendar controls, mood legend, responsive @media
  gridLayout.ts         # Pure responsive grid algorithm + gridCSSVars helper
  localStore.ts         # localStorage persistence wrapper
  vkYearStorage.ts      # VK Storage sync (debounced single-blob-per-year)
  vkBridge.ts           # Centralized VK Bridge service — the ONLY module that talks to the bridge (mock-vs-real, timeouts, errors→null, memoized initVkBridge)
  vkBridgeMock.ts       # Dev-mode canned responses (in-memory storage round-trip) so the app runs in a plain browser
  logger.ts             # Env-aware logger; logger.diag always emits (for prod-visible traces inside the VK client)
  vkAds.ts              # Banner ad show/hide helpers on top of vkBridgeService (awaits init before show)
  vkPlatform.ts         # Reads vk_platform query param (desktop_web detection)
  storyImage.ts         # Canvas-drawn 720x1280 story image for VKWebAppShowStoryBox
  exportReport.ts       # Markdown year-report builder + filled-entry collector
  haptics.ts            # VK Bridge haptic helpers (selection / success)
  uiPrefs.ts            # Grid-density preference persistence
  utils.ts              # Date utilities, leap year, month indices, mood helpers, downloadText
  quotes.ts             # 366 Russian motivational quotes + deterministic hash picker
  stats.ts              # Year statistics computation (streaks, moods, fill %)
  badges.ts             # Badge definitions and earned badge computation
  __tests__/            # Test files mirroring source modules
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
- `vitest.setup.ts` mocks `ResizeObserver` (absent from jsdom) and stubs `window.vkBridge` so the service takes the real-bridge path (suites mock `@vkontakte/vk-bridge` directly).
- External dependencies (`vk-bridge`, `html2canvas`) are mocked in tests.
- **Coverage thresholds** (enforced in CI): 90% lines, 90% functions, 80% branches, 90% statements.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR:
1. `npm ci`
2. `npm run build`
3. `npm run test:coverage`

All steps must pass.

## Architecture Notes

- **Composition root**: `App.tsx` wires hooks into components; it owns no domain state itself. Year/day state lives in `hooks/useYearView.ts`, grid sizing in `hooks/useGridLayout.ts`, and color-scheme/theme in `hooks/useVkTheme.ts`.
- **Data model**: `Store` holds `{ version, year, days }` where `days` is a `Record<string, DayData>` keyed by `YYYY-MM-DD`.
- **Storage strategy**: On mount, data hydrates from VK Storage (merged with localStorage). All updates mirror to both stores. VK Storage writes are debounced (600ms).
- **Theming**: Built on VKUI tokens so the UI works in both **light and dark** schemes (driven by `VKWebAppGetConfig` / `VKWebAppUpdateConfig`). Styles should use `--vkui--*` tokens and the shared mood/radius tokens in `styles/global.css`; avoid dark-only `rgba(255,255,255,…)` overlays. The export artifacts (`ExportCard`, `storyImage`) are intentionally self-contained fixed-theme images and do **not** follow the live scheme.
- **Grid layout**: `computeBestLayout()` tries column counts (16–34 comfortable / 20–36 compact) and picks the largest cell that fits `maxWidth` (default 420px; desktop passes a wider cap with a `maxCell` ceiling so the grid stays dense and centered). Gap tightens on narrow screens (<420px). The export card uses its own fixed `EXPORT_LAYOUT`, independent of the on-screen grid.
- **Year navigation**: `viewYear` state drives all year-dependent logic. `changeYear()` synchronously updates store, selection, and VK writer; an effect handles async VK hydration. Navigation goes back to any past year and forward only up to the current year.
- **Quotes**: `quotes.ts` holds 366 Russian quotes. `getQuoteForDate()` hashes the date key string to deterministically pick one.
- **Stats**: `stats.ts` is a pure function computing `YearStats` from the days record. Used by both the stats panel and the badges system.
- **Badges**: `badges.ts` defines 6 declarative `BadgeDef` objects with threshold-based `check` functions evaluated against `YearStats`.
- **Exports**:
  - **PNG** — `ExportCard` is rendered off-screen and rasterized with html2canvas. Delivery: on non-desktop VK, the PNG is uploaded to **telegra.ph** and handed to `VKWebAppDownloadFile`; otherwise it tries the Web Share API, then falls back to an `<a download>` link.
  - **Markdown** — a year report from `exportReport.ts`, delivered via Web Share API or `downloadText` fallback (there is no JSON export).
  - **Story** — `storyImage.ts` draws a canvas image shared via `VKWebAppShowStoryBox`.
  - ⚠️ The telegra.ph upload sends an image containing the user's moods/notes to a third party; keep this in mind for privacy and document any changes.

## Coding Conventions

- TypeScript strict mode enabled.
- Functional React with hooks only (no class components).
- CSS custom properties (`--cols`, `--cell`, `--gap`) set by JS for the responsive grid (via the typed `gridCSSVars` helper in `gridLayout.ts`).
- Style with VKUI `--vkui--*` tokens so both light and dark schemes work; reuse the radius/mood tokens in `styles/global.css`.
- All VK Bridge calls go through `vkBridgeService.*` (src/vkBridge.ts) — never call `bridge.send` directly. The service mocks in dev, applies timeouts, and resolves errors to `null` (it never rejects), so callers check the resolved value instead of catching. Do not gate the first banner show on `VKWebAppCheckBannerAd` — it reports an already-shown banner, not availability.
- Interactive non-VKUI controls carry Russian `aria-label`s and stable `data-testid`/`data-date` hooks for tests.
- UI language is Russian.
