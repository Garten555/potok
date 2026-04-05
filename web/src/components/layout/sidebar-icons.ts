/**
 * Единый размер иконок в сайдбарах (главный, студия, админ):
 * пункты навигации, нижние ссылки, кнопки меню/закрытия в шапке панели.
 */
export const SIDEBAR_ICON_CLASS = "h-[18px] w-[18px] shrink-0";

/** Иконки в узком сайдбаре студии/админки (только иконка, подпись в title). */
export const SIDEBAR_ICON_RAIL_CLASS = "h-[22px] w-[22px] shrink-0";

/**
 * Свёрнутый сайдбар на lg+: активная зона пункта — квадрат 36×36, как у кнопки «меню»,
 * а не полоса на всю ширину колонки (студия, админка).
 */
export const SIDEBAR_NAV_COLLAPSED_SQ =
  "lg:mx-auto lg:size-9 lg:min-h-9 lg:min-w-9 lg:max-h-9 lg:max-w-9 lg:gap-0 lg:p-0";
