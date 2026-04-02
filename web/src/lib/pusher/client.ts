import PusherJs from "pusher-js";

export function createPusherClient() {
  return new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });
}
