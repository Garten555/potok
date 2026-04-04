/** Заголовок зоны студии в контенте (не в сайдбаре). */
export function StudioBrandHero() {
  return (
    <header className="mb-6 hidden lg:mb-8 lg:block">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#101827]/95 via-[#0b1220] to-[#061018] px-5 py-5 sm:px-7 sm:py-6">
        <div
          className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rounded-full bg-cyan-400/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300/55">Поток</p>
          <h1 className="mt-1.5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-300/90 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
            Studio
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
            Загрузка роликов, библиотека, плейлисты и оформление канала.
          </p>
        </div>
      </div>
    </header>
  );
}
