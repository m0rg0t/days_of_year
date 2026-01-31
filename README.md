# Дни года (VK Mini Apps)

[![CI](https://github.com/m0rg0t/days_of_year/workflows/CI/badge.svg)](https://github.com/m0rg0t/days_of_year/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/m0rg0t/days_of_year/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/m0rg0t/days_of_year/actions/workflows/pages.yml)

> «Этот день — один из твоих 365.»

Мини‑приложение VK, которое визуализирует год как сетку дней.

## MVP (без backend)
- Год представлен сеткой из **365** кружков (в високосный год — **366**).
- **Текущий день** выделен.
- **Прошлые** дни — заполнены.
- **Будущие** — пустые.
- Один экран, без скролла (адаптивная сетка).

## Усиления (локально)
- **Цвет настроения дня** (опционально): выбрать для текущего дня.
- **Мини‑вопрос дня**: «Что сегодня было важным?» → одно слово, хранится локально.
- Тап по кружку показывает сохранённые данные этого дня.
- Экспорт: картинка (PNG) + данные (JSON) локально, без сервера.

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
