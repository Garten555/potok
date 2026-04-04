import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";

export default function ServiceRulesPage() {
  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Правила сервиса ПОТОК</h1>
        <p className="mt-2 text-sm text-slate-400">
          Кратко о том, как устроены жалобы, ограничения и обжалование. Полные формулировки могут дополняться
          администрацией; следите за обновлениями страницы.
        </p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
          <h2 className="text-base font-medium text-slate-100">Жалобы</h2>
          <p>
            Пользователи могут отправлять жалобы на видео, каналы и комментарии. Модераторы рассматривают обращения и
            могут скрывать материалы или применять санкции к каналу. Учитываются жалобы на видео и канал (жалобы только
            на комментарии в расчёте накопительных санкций к каналу не идут).
          </p>

          <h2 className="pt-2 text-base font-medium text-slate-100">Накопительные меры</h2>
          <ul className="list-inside list-disc space-y-2 text-slate-300">
            <li>
              <strong className="font-medium text-slate-200">От 2 активных жалоб</strong> (не отклонённых): временное
              ограничение загрузки новых видео примерно на неделю.
            </li>
            <li>
              <strong className="font-medium text-slate-200">От 3 активных жалоб</strong>: канал скрывается от
              зрителей, но подписчики не удаляются автоматически. Автор может обжаловать решение через поддержку.
            </li>
            <li>
              <strong className="font-medium text-slate-200">От 6 активных жалоб</strong>: долгая блокировка канала
              (например на 6 месяцев) без возможности обжаловать именно этот срок; подписчики по-прежнему не
              обнуляются.
            </li>
          </ul>

          <h2 className="pt-2 text-base font-medium text-slate-100">Письма</h2>
          <p>
            При поступлении жалоб и при переходе на новый уровень ограничений на указанную в аккаунте почту может
            уходить уведомление (тема и текст зависят от ситуации). Если письма нет, проверьте папку «Спам» и настройки
            SMTP на стороне сервиса.
          </p>

          <h2 className="pt-2 text-base font-medium text-slate-100">Самозаморозка</h2>
          <p>
            Отдельно от модерации действует добровольная заморозка аккаунта в настройках — с ней связаны другие правила
            (в т.ч. подписки). Это не то же самое, что скрытие канала по жалобам.
          </p>
        </section>

        <p className="mt-10 text-sm text-slate-500">
          <Link href="/" className="text-cyan-300 hover:underline">
            На главную
          </Link>
        </p>
      </main>
    </div>
  );
}
