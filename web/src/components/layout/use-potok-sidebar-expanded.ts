"use client";

import { useCallback, useEffect, useState } from "react";

/** Тот же ключ, что и у главного сайдбара — единое поведение «развёрнуто / иконки» на всём сайте. */
export const POTOK_SIDEBAR_STORAGE_KEY = "potok-sidebar-open";

export const DESKTOP_LG = "(min-width: 1024px)";

/**
 * Состояние широкого сайдбара на десктопе (lg+), синхронизируется с localStorage.
 * На узких экранах expanded не используется для выезда drawer — там своя логика.
 */
export function usePotokSidebarExpanded() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_LG);
    const sync = () => {
      if (mq.matches) {
        const stored = window.localStorage.getItem(POTOK_SIDEBAR_STORAGE_KEY);
        setExpanded(stored === null ? true : stored === "true");
      } else {
        setExpanded(false);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (window.matchMedia(DESKTOP_LG).matches) {
        window.localStorage.setItem(POTOK_SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return { expanded, toggleExpanded, setExpanded };
}

/** Для показа подписей в сайдбаре: на десктопе — expanded, на мобильном — открыт ли drawer. */
export function useSidebarShowLabels(expanded: boolean, mobileDrawerOpen: boolean) {
  const [isLg, setIsLg] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_LG);
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isLg ? expanded : mobileDrawerOpen;
}
