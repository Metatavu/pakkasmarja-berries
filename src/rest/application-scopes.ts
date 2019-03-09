export const CHAT_GROUP_ACCESS = "chat-group:access";
export type CHAT_GROUP_ACCESS = typeof CHAT_GROUP_ACCESS;

export const CHAT_GROUP_MANAGE = "chat-group:manage";
export type CHAT_GROUP_MANAGE = typeof CHAT_GROUP_MANAGE;

export type ApplicationScope = CHAT_GROUP_ACCESS | CHAT_GROUP_MANAGE;