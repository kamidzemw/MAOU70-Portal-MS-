# School Ideas — Банк идей

Статический сайт для GitHub Pages + Supabase.

## Файлы
- `index.html` — публичная часть
- `admin.html` — админ-панель
- `style.css` — дизайн
- `app.js` — авторизация, идеи и голосование
- `admin.js` — управление идеями

## Supabase
В коде используются:
- Project URL: https://xshennhqddkslbunummb.supabase.co
- Publishable key: из Settings → API → Publishable key

Secret key в браузер не добавляется.

## GitHub Pages
1. Создать репозиторий.
2. Загрузить все файлы в корень репозитория.
3. Settings → Pages → Deploy from a branch → main / root.
4. Открыть выданный GitHub Pages URL.

Для OAuth/редиректов, если они понадобятся позже, добавить домен GitHub Pages в Supabase Authentication → URL Configuration.
