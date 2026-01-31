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
- Экспорт: красивая PNG-картинка для Stories и JSON-дамп данных

Данные хранятся в VK Storage и дублируются в localStorage — ничего не потеряется.

---

## Возможности

- Год представлен сеткой из **365** кружков (в високосный год — **366**)
- **Текущий день** выделен, **прошлые** — заполнены, **будущие** — пустые
- Один экран, без скролла (адаптивная сетка)
- **Цвет настроения** для любого прошлого или текущего дня
- **Вопрос дня**: «Что было важным?» — одно слово
- **Навигация по годам** — ← / →
- **Цитата дня** — мотивационная цитата, уникальная для каждого дня
- **Разделители месяцев** — подписи над первым днём каждого месяца
- **Статистика** — заполненность, стрики, распределение настроений
- **Бейджи** — 6 достижений за регулярность
- **Экспорт**: PNG + JSON

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

## Промпты для генерации иконки приложения

Иконка должна быть в стиле VK Mini Apps — минималистичная, яркая, с градиентом и одним крупным символом по центру. Размер: 256x256 px, скруглённые углы.

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
