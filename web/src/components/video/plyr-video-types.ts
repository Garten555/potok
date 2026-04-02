import type { Options, SourceInfo } from "plyr";

/** Только типы — без импорта runtime plyr (иначе SSR ловит document is not defined). */
export type PlyrVideoProps = {
  source: SourceInfo;
  options?: Options;
  className?: string;
};

export type PlyrVideoHandle = {
  plyr: InstanceType<typeof import("plyr").default> | null;
};
