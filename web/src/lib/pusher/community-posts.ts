/** Канал Pusher для постов сообщества канала (user_id владельца = id канала). */
export const COMMUNITY_POSTS_UPDATED_EVENT = "community:posts_updated";

export function communityPostsPusherChannel(channelOwnerUserId: string): string {
  return `community-${channelOwnerUserId}`;
}
