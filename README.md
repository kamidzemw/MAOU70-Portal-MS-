# Школьный портал МАОУ СОШ №70

PWA-портал на GitHub Pages + Supabase.

Разделы:
- 💡 Банк идей
- 😂 Школьные мемы
- 📅 Мероприятия
- 🗳️ Опросы
- 📢 Новости
- 🔐 Регистрация и админ-панель

## 1. Supabase
1. Откройте Supabase → SQL Editor.
2. Выполните `supabase.sql` целиком.
3. В `supabase-config.js` уже указаны URL проекта и publishable key.
4. Никогда не добавляйте Secret/Service Role key в этот проект.

## 2. GitHub Pages
Загрузите все файлы в корень репозитория и включите:
Settings → Pages → Deploy from branch → main → / (root).

## 3. Первый администратор
Зарегистрируйтесь через сайт, затем в Supabase SQL Editor выполните:

UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'ВАША_ПОЧТА');

После этого обновите страницу.

## 4. PWA
На телефоне откройте GitHub Pages → меню браузера → «Добавить на главный экран».
Для Android браузер может показать «Установить приложение».

## Архитектура
GitHub Pages раздаёт интерфейс. Supabase хранит пользователей и данные.
Вся защита критичных операций находится в RLS/SQL, а не только в JavaScript.
