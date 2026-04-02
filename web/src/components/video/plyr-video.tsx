"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { PlyrVideoHandle, PlyrVideoProps } from "@/components/video/plyr-video-types";

/** Конструктор из ESM; в .d.ts смешаны `export=` и `default` — тип только через .default */
type PlyrConstructor = typeof import("plyr").default;
type PlyrInstance = InstanceType<PlyrConstructor>;

export type { PlyrVideoHandle, PlyrVideoProps } from "@/components/video/plyr-video-types";

/**
 * Plyr через dynamic import (без top-level). Стили подключены в layout.tsx.
 */
export const PlyrVideo = forwardRef<PlyrVideoHandle | null, PlyrVideoProps>(
  function PlyrVideo({ source, options, className }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<PlyrInstance | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const sourceKey = useMemo(() => {
      const s = source?.sources?.[0];
      const poster = source?.poster ?? "";
      return `${String(s?.src ?? "")}|${String(s?.type ?? "")}|${poster}`;
    }, [source]);

    useImperativeHandle(
      ref,
      () => ({
        get plyr() {
          return playerRef.current;
        },
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      const el = videoRef.current;
      if (!el) return;

      void (async () => {
        try {
          const mod = await import("plyr");
          const PlyrCtor = (mod as unknown as { default: PlyrConstructor }).default;
          if (cancelled || videoRef.current !== el) return;

          const player = new PlyrCtor(el, optionsRef.current ?? {});
          if (cancelled || videoRef.current !== el) {
            try {
              player.destroy();
            } catch {
              /* ignore */
            }
            return;
          }

          playerRef.current = player;
          try {
            player.source = source;
          } catch {
            /* ignore */
          }
        } catch (e) {
          console.error("[PlyrVideo] init failed", e);
        }
      })();

      return () => {
        cancelled = true;
        const p = playerRef.current;
        playerRef.current = null;
        if (p) {
          try {
            p.destroy();
          } catch {
            /* ignore */
          }
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceKey]);

    return (
      <video
        ref={videoRef}
        className={className ?? "plyr-react plyr"}
        playsInline
        preload="metadata"
      />
    );
  },
);
