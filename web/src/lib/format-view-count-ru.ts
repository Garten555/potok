/** «1 просмотр», «2 просмотра», «5 просмотров» — для числительных на русском. */
export function formatViewCountRu(views: number | null | undefined): string {
  const n = Math.max(0, Math.floor(Number(views ?? 0)));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word: string;
  if (mod100 >= 11 && mod100 <= 14) {
    word = "просмотров";
  } else if (mod10 === 1) {
    word = "просмотр";
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = "просмотра";
  } else {
    word = "просмотров";
  }
  return `${n.toLocaleString("ru-RU")} ${word}`;
}
