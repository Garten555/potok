/** Мгновенная оболочка при переходах между маршрутами (Streaming / Suspense). */
export default function AppLoading() {
  return (
    <div
      className="min-h-[40vh] w-full animate-pulse bg-gradient-to-b from-[#141a2a]/80 via-[#111726]/60 to-transparent"
      aria-busy
      aria-label="Загрузка страницы"
    />
  );
}
