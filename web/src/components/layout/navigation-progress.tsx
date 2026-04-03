"use client";

import NextTopLoader from "nextjs-toploader";

/**
 * Глобальная полоска загрузки при навигации (как у YouTube).
 * Подключается один раз в корневом layout — покрывает все страницы.
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color="#ff0000"
      height={2}
      showSpinner={false}
      crawlSpeed={120}
      speed={280}
      initialPosition={0.08}
      easing="linear"
      shadow="0 0 10px rgba(255,0,0,0.45)"
      zIndex={99999}
    />
  );
}
