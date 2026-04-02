"use client";

type TriggerPayload = {
  channel: string;
  event: string;
  payload?: unknown;
};

export async function triggerPusherEvent({ channel, event, payload }: TriggerPayload) {
  await fetch("/api/realtime/pusher/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, event, payload }),
  }).catch(() => {
    // Для UI нам не важны ошибки пушера.
  });
}

