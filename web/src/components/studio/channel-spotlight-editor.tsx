"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChannelAvatar } from "@/components/channel/channel-avatar";

type Row = {
  id: string;
  position: number;
  target_user_id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
};

/** Редактор списка @handle для блока «другие каналы» (заголовок — в строке раздела главной). */
export function ChannelSpotlightLinksForm({ ownerUserId }: { ownerUserId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [handleInput, setHandleInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: links } = await supabase
      .from("channel_spotlight_links")
      .select("id, position, target_user_id")
      .eq("owner_id", ownerUserId)
      .order("position", { ascending: true });

    const ids = (links ?? []).map((l) => (l as { target_user_id: string }).target_user_id);
    if (ids.length === 0) {
      setRows([]);
      return;
    }
    const { data: users } = await supabase
      .from("users")
      .select("id, channel_name, channel_handle, avatar_url")
      .in("id", ids);
    const um = new Map((users ?? []).map((u) => [u.id as string, u]));
    setRows(
      (links ?? []).map((l) => {
        const row = l as { id: string; position: number; target_user_id: string };
        const u = um.get(row.target_user_id);
        return {
          id: row.id,
          position: row.position,
          target_user_id: row.target_user_id,
          channel_name: u?.channel_name ?? null,
          channel_handle: u?.channel_handle ?? null,
          avatar_url: u?.avatar_url ?? null,
        };
      }),
    );
  }, [ownerUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addByHandle = async () => {
    const raw = handleInput.trim().replace(/^@/, "");
    if (!raw) return;
    setBusy(true);
    setMsg("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: target } = await supabase
        .from("users")
        .select("id, channel_name, channel_handle, avatar_url")
        .ilike("channel_handle", raw)
        .maybeSingle();
      const t = target as {
        id: string;
        channel_name: string | null;
        channel_handle: string | null;
        avatar_url: string | null;
      } | null;
      if (!t) {
        setMsg("Канал с таким @не найден.");
        return;
      }
      if (t.id === ownerUserId) {
        setMsg("Нельзя добавить свой канал.");
        return;
      }
      const maxPos = rows.reduce((m, r) => Math.max(m, r.position), -1);
      const { error } = await supabase.from("channel_spotlight_links").insert({
        owner_id: ownerUserId,
        target_user_id: t.id,
        position: maxPos + 1,
      });
      if (error) {
        setMsg(error.message.includes("unique") ? "Этот канал уже в списке." : error.message);
        return;
      }
      setHandleInput("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setMsg("");
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("channel_spotlight_links").delete().eq("id", id).eq("owner_id", ownerUserId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-[#0b1120]/50 p-3">
      <p className="text-xs text-slate-500">
        Ссылки на чужие каналы (друзья, коллабы). Показываются в этом месте на главной, если список не пуст.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={handleInput}
          onChange={(e) => setHandleInput(e.target.value)}
          placeholder="@handle канала"
          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-[#080d18] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addByHandle())}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void addByHandle()}
          className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
        >
          Добавить
        </button>
      </div>
      {msg ? <p className="text-sm text-amber-200/90">{msg}</p> : null}
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0b1120]/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ChannelAvatar
                  channelName={r.channel_name ?? r.channel_handle ?? "?"}
                  avatarUrl={r.avatar_url}
                  className="!h-9 !w-9"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{r.channel_name ?? r.channel_handle}</p>
                  <p className="truncate text-xs text-slate-500">@{r.channel_handle}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(r.id)}
                className="shrink-0 rounded border border-rose-400/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
              >
                Убрать
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Список пуст — добавьте каналы по @handle.</p>
      )}
    </div>
  );
}
