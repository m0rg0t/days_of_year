# Дни года (VK Mini Apps)

[![CI](https://github.com/m0rg0t/days_of_year/workflows/CI/badge.svg)](https://github.com/m0rg0t/days_of_year/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/m0rg0t/days_of_year/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/m0rg0t/days_of_year/actions/workflows/pages.yml)

> «Этот день — один из твоих 365.»

Мини‑приложение VK, которое визуализирует год как адаптивную сетку из 365 кружков. Отмечай настроение, записывай мысли, следи за прогрессом — и получай бейджи за стабильность.

---

## Описания для каталога VK Mini Apps

### Короткое описание (до 120 символов)
Визуализируй свой год: 365 дней в одной сетке. Настроение, цитаты, стрики и бейджи.

### Полное описание
**Дни года** — это визуальный дневник-трекер, который превращает ваш год в красивую сетку из 365 кружков.

Каждый день — это точка. Прошлые дни заполняются автоматически, текущий день выделен. Для любого прошлого или текущего дня можно отметить настроение (цветом) и записать одно важное слово.

**Возможности:**
- Адаптивная сетка дней с подписями месяцев
- Цвет настроения дня: спокойный, хороший, напряжённый, яркий
- Вопрос дня: «Что было важным?» — одно слово на каждый день
- Навигация по годам — смотрите прошлые годы
- Мотивационная цитата на каждый день
- Статистика года: заполненность, стрики, распределение настроений
- 6 бейджей: от «Первый день» до «Полный год»
- Экспорт: красивая PNG-картинка и Markdown-отчёт за год, плюс «Поделиться в историю»

Данные хранятся в VK Storage и дублируются в localStorage — ничего не потеряется.

---

## Возможности

- Год представлен сеткой из **365** кружков (в високосный год — **366**)
- **Текущий день** выделен, **прошлые** — заполнены, **будущие** — пустые
- **Адаптивная сетка** — на десктопе календарь и карточка дня рядом, на телефоне — друг под другом
- Поддержка **светлой и тёмной** тем VK
- **Цвет настроения** для любого прошлого или текущего дня
- **Вопрос дня**: «Что было важным?» — одно слово
- **Навигация по годам** — ← / →
- **Цитата дня** — мотивационная цитата, уникальная для каждого дня
- **Разделители месяцев** — подписи над первым днём каждого месяца
- **Статистика** — заполненность, стрики, распределение настроений
- **Бейджи** — 6 достижений за регулярность
- **Экспорт**: PNG-картинка, Markdown-отчёт и шеринг в истории VK

## Запуск локально
```bash
npm install
npm run dev
```

## Сборка
```bash
npm run build
npm run preview
```

## Тесты
```bash
npm run test:run       # Запуск один раз
npm run test:coverage  # С отчётом покрытия
```

---

## Иконка приложения

В проекте уже есть встроенная иконка [`public/icon.svg`](public/icon.svg) — сетка точек в фирменном стиле приложения (тёмный фон, прошедшие дни серым, сегодня — синим акцентом, будущие — пустыми кольцами). Используется как favicon.

Промпты ниже — для генерации иконки каталога VK (256x256 px, скруглённые углы) в близкой стилистике, если нужен растровый вариант:

### Вариант 1 (сетка точек)
```
Minimalist app icon, 256x256, rounded square shape. Dark purple-to-indigo gradient background.
In the center: a small 4x4 grid of circular dots — some filled white, one highlighted
with a bright indigo glow. Clean, flat design, no text. VK Mini Apps style icon.
```

### Вариант 2 (календарный круг)
```
Minimalist app icon, 256x256, rounded square. Gradient from deep violet (#4F46E5) to
purple (#7C3AED). Center: a single large white circle with a small filled dot inside,
suggesting "today". Subtle ring of tiny dots around it representing the year.
Flat, modern, no text. VK style.
```

### Вариант 3 (365 + точка)
```
Flat minimalist app icon, 256x256 rounded square. Vibrant indigo-purple gradient
background. Simple white icon: the number "365" in bold geometric font with a small
glowing dot above the "3". No shadows, no text below. Clean VK Mini Apps aesthetic.
```

### Вариант 4 (мозаика настроений)
```
Minimalist app icon, 256x256, rounded corners. Dark background with soft purple gradient.
Center: a 5x5 mosaic of small rounded squares in blue, green, yellow, and red pastels —
representing mood colors. One square glows brighter. Flat vector style, no text, VK aesthetic.
```


## Maintenance validation (October 2026)

Use Node.js 24 LTS (24.15 or later; `.nvmrc` selects 24) and `npm ci`.
The stack uses React 19.3, VKUI 8.4, Bridge 3, Vite 8, Vitest 5 and ESLint 10.
TypeScript stays on 6.0.3 because typescript-eslint currently requires `<6.1.0`;
Node type definitions stay on the matching 24 branch.

`npm run check` runs lint, typecheck/build and the existing coverage gate
(90% lines/functions/statements, 80% branches). `npm run test:timezone` also
checks calendar arithmetic in America/New_York across daylight-saving changes.
`npm run test:e2e` covers mobile editing, modal closure, desktop/mobile resizing
and reloading with synthetic local/Bridge storage; install Chromium with
`npx playwright install chromium` first. CI retains responsive screenshots.

VK year migration keeps the legacy record until all monthly writes succeed,
recovers unmigrated months, and serializes outstanding writes. A failed or
incomplete cloud read cannot authorize a write; local edits remain usable.
Edits made during hydration take priority over the older snapshot, and late
responses from a previous year are ignored. Native init calls are bounded.

PR CI uses `contents: read`, synthetic data and no deployment credentials.
Existing GitHub Pages publishing triggers remain limited to main/manual runs;
no deployment was performed for this maintenance work. Validate native VK ads,
sharing, storage and mobile client behavior before a release.
