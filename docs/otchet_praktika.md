# ОТЧЁТ О ПРОХОЖДЕНИИ ПРОИЗВОДСТВЕННОЙ ПРАКТИКИ

Проект POTOK  
Дата формирования отчёта 30.03.2026

## Содержание

1. Цель, задачи, описание базы прохождения производственной практики  
   1.1. Цель и задачи производственной практики  
   1.2. Общее ознакомление с организацией  
2. Разработка веб-приложения (или его части)  
   2.1. Техническое задание на разработку веб-приложения  
   2.2. Разработка графического интерфейса веб-приложения  
   2.3. Разработка базы данных веб-приложения  
   2.4. Разработка механизмов авторизации и аутентификации пользователей веб-приложения  
   2.5. Работа с серверной частью программного продукта. Отправка и получение данных из БД  
3. Оптимизация и безопасность веб-приложения  
   3.1. Проведение внутренней SEO-оптимизации сайта  
   3.2. Проведение общего аудита сайта: SEO, юзабилити, тексты  
   3.3. Исследование способов ускорения загрузки сайта  
   3.4. Проверка безопасности веб-приложения  
Заключение

---

## 1 Цель, задачи, описание базы прохождения производственной практики

### 1.1 Цель и задачи производственной практики

Главная цель производственной практики — осознанно применить на практике теоретические знания, полученные в рамках профессионального модуля ПМ 09 «Проектирование, разработка и оптимизация веб-приложений», и получить законченный результат в виде работающего веб-приложения POTOK (видеоплатформа: лента, поиск, просмотр, канал, студия автора, авторизация, работа с базой данных и серверными API). Практика должна была показать умение переводить постановку задачи в архитектурные решения, затем — в код, конфигурацию и проверяемый на сборке проект.

К **задачам практики** отнесено следующее: изучить и зафиксировать требования технического задания; спроектировать пользовательский интерфейс (в т.ч. макет в Figma) и перенести его в компоненты Next.js с адаптивной вёрсткой; спроектировать и реализовать схему базы данных в PostgreSQL (Supabase) с политиками доступа RLS; внедрить регистрацию, вход и сценарии восстановления доступа через Supabase Auth; обеспечить обмен данными между клиентом и сервером через официальный SDK и серверные маршруты приложения; подключить обновления в реальном времени (Pusher) там, где это предусмотрено ТЗ; провести базовую проверку SEO-метаданных, производительности сборки и мер безопасности; оформить отчёт с **листингами исходного кода** по соответствующим подпунктам (без замены кода перечнем папок).

Результатом считается не только «запущенный локально» проект, но и воспроизводимость: команда `npm run build` в каталоге `web` завершается без ошибок, конфиденциальные параметры вынесены в переменные окружения, а доступ к данным на уровне БД ограничен политиками RLS.

### 1.2 Общее ознакомление с организацией

Практика выполнялась в формате **учебного проекта** в репозитории **potok** в сроки, установленные учебным заведением. Организация работы — индивидуальная или малый коллектив с распределением ролей; координация через систему контроля версий (git), согласование интерфейса по макету Figma и проверка сценариев после каждого логически завершённого этапа.

**База практики** — программный комплекс на стеке **Next.js (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Pusher, Plyr**. Разработка велась в среде с Node.js; тестирование — в браузере и через production-сборку. Документация по требованиям: **docs/tehnicheskoe_zadanie_potok.pdf** (исходник разметки — TECH_SPEC.md в репозитории).

---

## 2 Разработка веб-приложения (или его части)

Общая линия разработки: от утверждённого ТЗ и макета — к структуре маршрутов Next.js, компонентам интерфейса, схеме БД, авторизации и серверным точкам входа для данных и realtime. Ниже по каждому подпункту даны пояснения и **листинги фрагментов исходного кода** (файл и диапазон строк указаны перед каждым блоком).

### 2.1 Техническое задание на разработку веб-приложения

Техническое задание оформлено как **docs/tehnicheskoe_zadanie_potok.pdf**; рабочий текст и структура требований содержатся в **TECH_SPEC.md**. В ТЗ зафиксированы границы MVP: роли пользователей, сущности (видео, пользователи, комментарии, подписки и др.), требования к интерфейсу и нефункциональные ограничения (модульность, разделение клиента и сервера). Реализация в коде опирается на этот документ; PDF при необходимости собирается скриптом `scripts/generate_tz_pdf.py`.

Ниже приведён листинг **package.json** веб-приложения: зафиксированы зависимости (Next.js, React, Supabase, Pusher и др.) и сценарии `dev`, `build`, `lint`, что подтверждает воспроизводимость сборки и проверки качества кода.

#### Листинги исходного кода (зависимости и сценарии сборки)

**`web/package.json`** (строки 1–35)

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.100.0",
    "clsx": "^2.1.1",
    "lucide-react": "^1.0.1",
    "next": "16.2.1",
    "plyr": "^3.8.4",
    "plyr-react": "^6.0.0",
    "pusher": "^5.3.3",
    "pusher-js": "^8.4.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```


### 2.2 Разработка графического интерфейса веб-приложения

Макет интерфейса подготовлен в **Figma** (каркас: шапка, боковая панель, контентная зона; экраны главной, поиска, просмотра, канала, студии). В коде каркас реализован компонентами **AppHeader**, **Sidebar** (контекст состояния сайдбара), оболочкой **AppShell**, корневым **layout** и страницами в `web/src/app`. На главной используются полоса категорий (**CategoryChipsBar**) и лента рекомендаций (**HomeVideoFeed**) с адаптивной сеткой карточек (1–4 колонки в зависимости от ширины экрана). Для мобильных экранов в шапке предусмотрена кнопка открытия бокового меню; для устройств с вырезом экрана учтены отступы **safe-area**; полоса категорий закреплена под шапкой (**sticky**) с согласованным вертикальным смещением. Поиск в шапке (**SmartSearch**) встроен в гибкую строку с классами **min-w-0**, чтобы поле поиска корректно сжималось на узких ширинах.

#### Подсказки к иллюстрациям (что снять для отчёта, словами)

Ниже — пояснения, **какой экран** нужно зафиксировать на скриншоте. Сохраните файл под указанным **именем** — тогда при следующей генерации отчёта рисунок попадёт в документ автоматически.

**1. Главная: лента и категории** — файл: `01_glavnaya.png`

Откройте главную страницу приложения. Снимите экран целиком: в кадре должны быть верхняя шапка с логотипом и строкой поиска, под ней — горизонтальная полоса категорий (чипы), ниже — сетка карточек видео с превью и подписями. Удобная ширина окна — как у обычного ноутбука.

**2. Поиск и результаты** — файл: `02_poisk.png`

Перейдите в поиск, введите любой запрос так, чтобы появились результаты. Снимок должен показывать строку поиска с текстом запроса и список найденных видео (или пустое состояние «ничего не найдено», если так задумано).

**3. Просмотр видео: плеер и страница ролика** — файл: `03_prosmotr.png`

Откройте любое видео по ссылке просмотра. На скриншоте видны область плеера (можно на паузе), заголовок ролика, сведения о канале; по возможности — блок комментариев под видео.

**4. Студия автора** — файл: `04_studiya.png`

Зайдите в студию (после входа в аккаунт). Снимите экран с вкладками или разделами студии: загрузка, контент, плейлисты и т.п. — чтобы было видно, что это рабочий кабинет автора.

**5. Публичная страница канала** — файл: `05_kanal.png`

Откройте публичную страницу канала (по handle или из ссылки). На снимке должны быть шапка канала (название, аватар), список или сетка видео канала.

**6. Вход и регистрация** — файл: `06_auth.png`

Страница авторизации: форма входа или регистрации — поля email, пароль, кнопки отправки, при необходимости переключатель между режимами.

**7. Восстановление пароля** — файл: `07_reset_steps.png`

Экран сценария сброса пароля (например, ввод email для письма или шаги мастера восстановления), чтобы было видно логику работы с Supabase Auth.




#### Листинги исходного кода (интерфейс: макет, шапка, сайдбар, главная, поиск)

**`web/src/app/layout.tsx`** (строки 1–44)

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ПОТОК",
  description: "Видеоплатформа: просмотр, каналы, подписки",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e18",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

**`web/src/components/layout/app-header.tsx`** (строки 1–142)

```tsx
"use client";

import { Bell, CirclePlus, Grid2x2, LogIn, LogOut, Menu, Tv } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "@/components/auth/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSidebarState } from "@/components/layout/sidebar-context";
import { SmartSearch } from "@/components/search/smart-search";

type HeaderProfile = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
};

/** Верхняя шапка: как в концепте — бренд слева (иконка + ПОТОК), поиск, действия. Без второй строки. */
export function AppHeader() {
  const { toggleSidebar } = useSidebarState();
  const { isAuthenticated } = useAuthState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const avatarFallback = useMemo(() => {
    const source = profile?.channel_name?.trim();
    if (!source) return "Ю";
    return source.slice(0, 1).toUpperCase();
  }, [profile?.channel_name]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      setIsMenuOpen(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let unsubscribed = false;

    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || unsubscribed) return;
      const authUser = data.user;
      const { data: profileData } = await supabase
        .from("users")
        .select("id, channel_name, channel_handle, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileData) {
        if (!unsubscribed) setProfile(profileData);
        return;
      }

      const fallbackName =
        (authUser.user_metadata?.channel_name as string | undefined) ||
        (authUser.user_metadata?.username as string | undefined) ||
        authUser.email?.split("@")[0] ||
        "Канал";

      const { data: createdProfile } = await supabase
        .from("users")
        .upsert(
          {
            id: authUser.id,
            channel_name: fallbackName,
            avatar_url: null,
          },
          { onConflict: "id" },
        )
        .select("id, channel_name, channel_handle, avatar_url")
        .maybeSingle();

      if (!unsubscribed) {
        setProfile(createdProfile ?? null);
      }
    });

    return () => {
      unsubscribed = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isNotificationsOpen]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setIsSigningOut(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0a0d14]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-12 min-h-12 items-center gap-1.5 px-2 sm:gap-3 sm:px-4 md:gap-4 md:px-5 lg:px-6">
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:hidden"
          aria-label="Открыть меню навигации"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 shrink-0 items-center">
          <div
            className="h-9 w-[5.5rem] bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat sm:h-10 sm:w-32 md:h-11 md:w-36"
            aria-label="Логотип POTOK"
          />
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-0.5 sm:px-2">
          <SmartSearch />
        </div>
```

**`web/src/components/layout/sidebar.tsx`** (строки 39–100)

```tsx
export function Sidebar({ isOpen, onToggle, isAuthenticated }: SidebarProps) {
  /** На lg+ «открыт» = широкая панель; на мобильном — только выезд drawer */
  const showLabels = isOpen;
  const navItems = isAuthenticated ? authNavItems : guestNavItems;
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "h-screen shrink-0 border-r border-white/10",
        "bg-gradient-to-b from-[#111523] via-[#0d111d] to-[#0a0d17] backdrop-blur-md",
        "shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        "transition-[transform,width] duration-300 ease-out",
        // Мобильный / планшет: выезжающая панель
        "max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:z-50 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:pt-[env(safe-area-inset-top)]",
        "max-lg:w-[min(18rem,88vw)] max-lg:overflow-y-auto max-lg:px-3 max-lg:py-2.5",
        isOpen ? "max-lg:translate-x-0" : "max-lg:pointer-events-none max-lg:-translate-x-full",
        // Десктоп: в потоке, узкий или широкий режим
        "lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
        isOpen ? "lg:w-64 lg:px-3 lg:py-2.5" : "lg:w-[4.8rem] lg:px-2.5 lg:py-2",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-2 flex items-center gap-2 border-b border-white/8 pb-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label={isOpen ? "Свернуть меню" : "Открыть меню"}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div
            className={clsx(
              "h-10 shrink-0 bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat transition-[width,opacity] duration-300",
              showLabels ? "w-36 opacity-100" : "w-0 opacity-0",
            )}
            aria-label="Логотип ПОТОК"
          />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto pt-1 sm:gap-2 lg:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" && pathname === "/";

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => {
                  if (window.matchMedia("(max-width: 1023px)").matches && isOpen) {
                    onToggle();
                  }
                }}
                className={clsx(
                  "group flex min-w-0 items-center gap-3 rounded-xl py-2.5 text-left text-sm font-medium transition",
                  showLabels ? "w-full px-3" : "w-full justify-center px-0 lg:justify-center",
                  isActive
                    ? "bg-[#2f74ff]/18 text-[#b7d9ff] shadow-[inset_0_0_0_1px_rgba(83,153,255,0.35)]"
                    : "text-slate-300 hover:bg-white/8 hover:text-white",
```

**`web/src/components/home/category-chips-bar.tsx`** (строки 106–150)

```tsx
  return (
    <div
      className="sticky z-10 border-b border-cyan-500/15 bg-gradient-to-r from-[#0a101c]/95 via-[#0d1526]/95 to-[#0a101c]/95 backdrop-blur-md"
      style={{ top: "calc(3rem + env(safe-area-inset-top, 0px))" }}
    >
      {/* Отступы как у шапки; на узких экранах стрелки компактнее */}
      <div className="flex w-full items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4 md:px-5 lg:px-6">
        <button
          type="button"
          aria-label="Прокрутить категории влево"
          onClick={() => scrollByDir(-1)}
          disabled={!canScrollLeft}
          className={clsx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition sm:h-9 sm:w-9",
            "border-cyan-400/20 bg-slate-950/60 text-cyan-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]",
            canScrollLeft
              ? "hover:border-cyan-300/45 hover:bg-cyan-950/40 hover:text-cyan-50 hover:shadow-[0_0_18px_rgba(34,211,238,0.22)]"
              : "cursor-default opacity-25 hover:border-cyan-400/20 hover:bg-slate-950/60",
          )}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="relative min-w-0 flex-1">
          {canScrollLeft ? (
            <div
              className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-12 bg-gradient-to-r from-[#0c1528] via-[#0d1526]/85 to-transparent"
              aria-hidden
            />
          ) : null}
          {canScrollRight ? (
            <div
              className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-12 bg-gradient-to-l from-[#0c1528] via-[#0d1526]/85 to-transparent"
              aria-hidden
            />
          ) : null}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Категории видео"
          >
            {HOME_FEED_CATEGORIES.map((cat) => {
              const isActive = activeId === cat.id;
```

**`web/src/components/home/home-video-feed.tsx`** (строки 98–149)

```tsx
  return (
    <div className="pb-[max(2rem,env(safe-area-inset-bottom))]">
      <CategoryChipsBar onCategoryChange={(id) => setActiveCategory(id as HomeCategoryId)} />

      <section className="mx-auto max-w-[1920px] space-y-4 px-3 pt-3 sm:px-4 md:px-5 lg:px-6">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
          <PlayCircle className="h-4 w-4 text-cyan-200" />
          Рекомендации
        </h2>
        {filteredVideos.length > 0 ? (
          <div
            className={
              "grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-4 " +
              "lg:grid-cols-3 xl:grid-cols-4"
            }
          >
            {filteredVideos.map((video) => {
              const authorName = video.user_id ? authorsMap.get(video.user_id) ?? "Канал" : "Канал";
              return (
                <Link
                  key={video.id}
                  href={`/watch/${video.id}`}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                >
                  <div
                    className="aspect-video w-full bg-[#0b1323] bg-cover bg-center transition group-hover:scale-[1.01]"
                    style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})` } : undefined}
                  />
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-medium text-slate-100 transition group-hover:text-cyan-200">
                      {video.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {authorName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(video.views ?? 0).toLocaleString("ru-RU")} просмотров
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            По этой категории пока нет видео.
          </div>
        )}
      </section>
    </div>
  );
}
```

**`web/src/components/search/smart-search.tsx`** (строки 272–285)

```tsx
  return (
    <div className="relative min-w-0 w-full max-w-2xl" ref={containerRef}>
      <div
        className={clsx(
          "flex h-9 w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-slate-400",
        )}
      >
        <Search className="h-4 w-4 shrink-0 opacity-70" />
        <input
          className="w-full bg-transparent text-left text-xs text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="Поиск (как на YouTube)"
          type="search"
          aria-label="Поиск"
          value={query}
```

**`web/src/app/page.tsx`** (строки 1–36)

```tsx
import { AppHeader } from "@/components/layout/app-header";
import { HomeVideoFeed } from "@/components/home/home-video-feed";
import { redirect } from "next/navigation";

type HomeProps = {
  searchParams?: {
    tab?: string;
    q?: string | string[];
  };
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const tab = sp?.tab;
  const qParam = sp?.q;
  const q = Array.isArray(qParam) ? qParam[0] : qParam;

  if (tab === "search" && q) {
    redirect(`/search?q=${encodeURIComponent(q)}`);
  }

  if (tab === "history") {
    redirect("/history");
  }

  if (tab === "favorites") {
    redirect("/favorites");
  }

  return (
    <div>
      <AppHeader />
      <HomeVideoFeed />
    </div>
  );
}
```


### 2.3 Разработка базы данных веб-приложения

Схема базы данных и ограничения целостности задаются SQL-скриптами в каталоге **web/supabase**. Ключевые объекты: пользователи, видео, связанные сущности в соответствии с ТЗ. Доступ приложения к строкам таблиц регулируется **политиками RLS** (Row Level Security): пользователь видит и изменяет только разрешённые данные. Ниже приведены фрагменты скриптов с определением схемы и политик.

**Подсказка к иллюстрации к листингам БД:** снимок экрана Supabase Studio: раздел «Table Editor» или список таблиц, где видны названия таблиц и столбцов, соответствующих приведённым SQL-скриптам; либо фрагмент экрана SQL Editor с выполнением простого `SELECT` по таблице `videos` или `users`.

#### Листинги исходного кода (SQL: схема и RLS)

**`web/supabase/01_core.sql`** (строки 1–105)

```sql
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  channel_name text not null unique,
  avatar_url text,
  subscribers_count integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists users_channel_name_lower_uidx
  on public.users (lower(channel_name));

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

insert into public.categories (name, slug)
values
  ('Музыка', 'music'),
  ('Видеоигры', 'games'),
  ('Образование', 'education'),
  ('Спорт', 'sport'),
  ('Фильмы и сериалы', 'movies'),
  ('Комедия', 'comedy'),
  ('Техника', 'tech')
on conflict (slug) do nothing;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid not null references public.categories(id),
  tags text[] not null default '{}',
  video_url text not null,
  thumbnail_url text,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, channel_id),
  constraint subscriptions_no_self check (subscriber_id <> channel_id)
);

create table if not exists public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  type text not null check (type in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
```

**`web/supabase/03_rls_policies.sql`** (строки 1–85)

```sql
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists users_select_all on public.users;
create policy users_select_all on public.users
for select using (true);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
for insert with check (auth.uid() = id);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
for update using (auth.uid() = id);

drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
for select using (true);

drop policy if exists videos_select_all on public.videos;
create policy videos_select_all on public.videos
for select using (true);

drop policy if exists videos_insert_owner on public.videos;
create policy videos_insert_owner on public.videos
for insert with check (auth.uid() = user_id);

drop policy if exists videos_update_owner on public.videos;
create policy videos_update_owner on public.videos
for update using (auth.uid() = user_id);

drop policy if exists videos_delete_owner on public.videos;
create policy videos_delete_owner on public.videos
for delete using (auth.uid() = user_id);

drop policy if exists subscriptions_select_all on public.subscriptions;
create policy subscriptions_select_all on public.subscriptions
for select using (true);

drop policy if exists subscriptions_insert_self on public.subscriptions;
create policy subscriptions_insert_self on public.subscriptions
for insert with check (auth.uid() = subscriber_id);

drop policy if exists subscriptions_delete_self on public.subscriptions;
create policy subscriptions_delete_self on public.subscriptions
for delete using (auth.uid() = subscriber_id);

drop policy if exists likes_select_all on public.likes;
create policy likes_select_all on public.likes
for select using (true);

drop policy if exists likes_insert_self on public.likes;
create policy likes_insert_self on public.likes
for insert with check (auth.uid() = user_id);

drop policy if exists likes_update_self on public.likes;
create policy likes_update_self on public.likes
for update using (auth.uid() = user_id);

drop policy if exists likes_delete_self on public.likes;
create policy likes_delete_self on public.likes
for delete using (auth.uid() = user_id);

drop policy if exists comments_select_all on public.comments;
create policy comments_select_all on public.comments
for select using (true);

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments
for insert with check (auth.uid() = user_id);

drop policy if exists comments_update_self on public.comments;
create policy comments_update_self on public.comments
for update using (auth.uid() = user_id);

drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments
for delete using (auth.uid() = user_id);

drop policy if exists notifications_select_self on public.notifications;
```


### 2.4 Разработка механизмов авторизации и аутентификации пользователей веб-приложения

Аутентификация реализована через **Supabase Auth**: регистрация и вход по электронной почте и паролю, сброс пароля с подтверждением по ссылке из письма. Интерфейс сценариев входа и регистрации сосредоточен в **web/src/app/auth/page.tsx**; дополнительные маршруты — восстановление и сброс пароля. Шаблоны писем лежат в **web/supabase/email-templates/**.

**Подсказка к иллюстрации к листингам авторизации:** полноэкранный снимок страницы `/auth`: видны поля ввода, кнопки, переключение «вход / регистрация», если оно есть в интерфейсе.

#### Листинги исходного кода (страница авторизации, фрагмент)

**`web/src/app/auth/page.tsx`** (строки 1–88)

```tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";
type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  channelName?: string;
};

type PasswordValidationState = {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  noCyrillic: boolean;
  score: number;
  isStrong: boolean;
};

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "2200freefonts.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "dispostable.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "moakt.com",
  "minuteinbox.com",
  "maildrop.cc",
  "sharklasers.com",
  "grr.la",
]);

const RU_PROFANITY_PATTERNS = [
  /х+у+[йияеёю]*/u,
  /п[ие]зд/u,
  /еб[аеиёоуыюя]*/u,
  /бля[дть]*/u,
  /сук[аи]/u,
  /муд[ао]к/u,
  /гандон/u,
  /долбоеб/u,
  /чмо/u,
];

const EN_PROFANITY_PATTERNS = [
  /fuck/u,
  /shit/u,
  /bitch/u,
  /asshole/u,
  /dick/u,
  /cunt/u,
  /motherfucker/u,
  /fag/u,
  /slut/u,
  /whore/u,
];

function isDisposableEmail(email: string): boolean {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase();
  return (
    DISPOSABLE_EMAIL_DOMAINS.has(domain) ||
    Array.from(DISPOSABLE_EMAIL_DOMAINS).some(
      (blockedDomain) => domain.endsWith(`.${blockedDomain}`),
    )
  );
}

function normalizeForProfanity(value: string): string {
  return value
    .toLowerCase()
    .replace(/[@]/g, "a")
```


### 2.5 Работа с серверной частью программного продукта. Отправка и получение данных из БД

На клиенте для обращения к Supabase используется браузерный клиент (**createSupabaseBrowserClient** и аналоги в `web/src/lib/supabase/`). На сервере страницы загружают данные через серверный клиент Supabase (см. фрагмент страницы просмотра видео: выборка видео, канала, учёт просмотров). Для событий realtime вызывается API-маршрут **Pusher** (`web/src/app/api/realtime/pusher/trigger/route.ts`). Сравнение с крупными видеохостингами носит ориентировочный характер: в учебном MVP реализован объём функций согласно ТЗ, а не полный клон коммерческого сервиса.

**Подсказка к иллюстрации к листингам серверной части:** снимок страницы просмотра видео с загруженными данными (плеер, название, канал, счётчик просмотров) или скриншот сетевой вкладки браузера с успешным ответом API (без секретных ключей в кадре).

#### Листинги исходного кода (клиент Supabase, страница просмотра, API realtime)

**`web/src/lib/supabase/client.ts`** (строки 1–72)

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**`web/src/app/watch/[id]/page.tsx`** (строки 1–95)

```tsx
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { WatchPlayer } from "@/components/watch/watch-player";
import { CommentsSection } from "@/components/watch/comments-section";
import { RecommendationsPanel } from "@/components/watch/recommendations-panel";
import { VideoMetaBlock } from "@/components/watch/video-meta-block";
import { PlaylistWatchPanel } from "@/components/watch/playlist-watch-panel";
import { pusherServer } from "@/lib/pusher/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { loadPlaylistForWatch } from "@/lib/watch-playlist";

type WatchPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ list?: string }>;
};

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const listId = typeof sp?.list === "string" ? sp.list : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: videoWithVisibility, error: videoWithVisibilityError } = await supabase
    .from("videos")
    .select("id, user_id, title, description, video_url, thumbnail_url, views, visibility, created_at")
    .eq("id", id)
    .maybeSingle();

  let video = videoWithVisibility;

  if (
    videoWithVisibilityError &&
    videoWithVisibilityError.message.toLowerCase().includes("column") &&
    videoWithVisibilityError.message.toLowerCase().includes("visibility")
  ) {
    const { data: fallbackVideo } = await supabase
      .from("videos")
      .select("id, user_id, title, description, video_url, thumbnail_url, views, created_at")
      .eq("id", id)
      .maybeSingle();

    if (fallbackVideo) {
      video = { ...fallbackVideo, visibility: "public" };
    }
  }

  if (!video) notFound();

  const isOwner = viewer?.id === video.user_id;
  if (video.visibility === "private" && !isOwner) notFound();

  // Считаем просмотр максимум 1 раз на пользователя.
  if (viewer?.id) {
    try {
      const { data: existing } = await supabase
        .from("watch_history")
        .select("video_id")
        .eq("user_id", viewer.id)
        .eq("video_id", video.id)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from("watch_history")
          .upsert(
            {
              user_id: viewer.id,
              video_id: video.id,
              watched_at: new Date().toISOString(),
            },
            { onConflict: "user_id,video_id" },
          );

        const supabaseService = createSupabaseServiceClient();
        const nextViews = (video.views ?? 0) + 1;
        await supabaseService.from("videos").update({ views: nextViews }).eq("id", video.id);
        await pusherServer.trigger(`video-${video.id}`, "views:updated", { videoId: video.id, views: nextViews });
        video = { ...video, views: nextViews };
      }
    } catch {
      // Просмотры не должны ломать страницу просмотра.
    }
  }

  const { data: channelInfo } = await supabase
    .from("users")
    .select("channel_name, channel_handle, avatar_url, subscribers_count")
    .eq("id", video.user_id)
    .maybeSingle();

```

**`web/src/app/api/realtime/pusher/trigger/route.ts`** (строки 1–88)

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher/server";

const payloadSchema = z.object({
  channel: z.string().min(1),
  event: z.string().min(1),
  // Можно отправлять произвольный JSON (для реакций/вьюсов/комментов).
  payload: z.unknown().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const { channel, event, payload } = parsed.data;

  try {
    await pusherServer.trigger(channel, event, payload ?? {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pusher trigger failed" },
      { status: 500 },
    );
  }
}

```


---

## 3 Оптимизация и безопасность веб-приложения

### 3.1 Проведение внутренней SEO-оптимизации сайта

В корневом макете приложения заданы метаданные **title** и **description** (`web/src/app/layout.tsx`, объект **metadata**), что обеспечивает осмысленный заголовок вкладки и краткое описание при индексации и при публикации ссылок. Использование семантической вёрстки и предсказуемых маршрутов URL (`/watch/[id]`, `/search`, `/studio` и т.д.) упрощает навигацию и согласуется с рекомендациями по внутренней структуре сайта. Дополнительно выполнялась ручная проверка заголовков страниц и отсутствия «пустых» маршрутов в основных сценариях.

### 3.2 Проведение общего аудита сайта: SEO, юзабилити, тексты

Проведён обзор пользовательских путей: переход с главной к просмотру, поиск, вход в аккаунт, переход в студию. Оценивались читаемость интерфейса на разных ширинах экрана, доступность основных действий без горизонтальной прокрутки на мобильных устройствах, понятность подписей кнопок и форм. Тексты интерфейса на русском языке; сообщения об ошибках выводятся в пользовательском виде там, где это реализовано в компонентах.

### 3.3 Исследование способов ускорения загрузки сайта

Приложение собирается фреймворком **Next.js** с оптимизацией статических ресурсов в рамках production-сборки. Перед сдачей этапов выполнялась команда **`npm run build`**: успешная сборка подтверждает отсутствие блокирующих ошибок в типах и в конфигурации проекта. Изображения для превью видео подгружаются по URL из хранилища; плеер использует выбранную библиотеку без лишней вложенности компонентов. Дальнейшее профилирование (Lighthouse, разбиение чанков) возможно при отдельной постановке задачи.

### 3.4 Проверка безопасности веб-приложения

Доступ к данным в PostgreSQL ограничен **RLS**; секреты (ключи Supabase, Pusher) не хранятся в репозитории, а задаются через **переменные окружения**. Запросы к данным выполняются через SDK Supabase с учётом сессии пользователя. Серверные маршруты API с побочными эффектами должны проверять права вызывающего (реализация в соответствии с политикой проекта). Рекомендуется развёртывание по **HTTPS** на стороне хостинга.

---

### Сводная таблица реализованных модулей

| Модуль | Статус | Комментарий |
|---|---|---|
| Header + Sidebar | реализовано | каркас навигации, адаптив |
| Главная + поиск | реализовано | лента, категории, поиск |
| Просмотр видео | реализовано | плеер, комментарии |
| Канал + студия | реализовано | публикация, контент |
| Авторизация | реализовано | вход, регистрация, OTP |
| Reset Password | реализовано | многошаговый сценарий |
| Supabase + Pusher | реализовано | данные, Storage, realtime |

## Заключение

В ходе производственной практики разработан и доведён до собираемого состояния MVP веб-приложения **POTOK** в соответствии с **docs/tehnicheskoe_zadanie_potok.pdf**: реализованы подразделы **2.1–2.5** с приведёнными листингами кода, раздел **3** отражает меры по SEO, аудиту интерфейса, сборке и безопасности. Иллюстрации экранов приложения подставляются в отчёт автоматически, если в каталоге **docs/screenshots** лежат соответствующие изображения.

Исполнитель __________________ дата __________
