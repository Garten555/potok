"use client";

import NextTopLoader from "nextjs-toploader";

/** Акцент как у скроллбара и UI: cyan → blue (globals.css). */
const ACCENT = "#22d3ee";

/**
 * Глобальная полоска загрузки при навигации (тонкая линия сверху).
 * Подключается один раз в корневом layout — покрывает все страницы.
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color={ACCENT}
      height={2}
      showSpinner={false}
      crawlSpeed={120}
      speed={280}
      initialPosition={0.08}
      easing="linear"
      shadow="0 0 12px rgba(34, 211, 238, 0.55), 0 0 6px rgba(37, 99, 235, 0.35)"
      zIndex={99999}
    />
  );
}
