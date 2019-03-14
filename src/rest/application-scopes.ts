export const CHAT_GROUP_ACCESS = "chat-group:access";
export type CHAT_GROUP_ACCESS = typeof CHAT_GROUP_ACCESS;

export const CHAT_GROUP_MANAGE = "chat-group:manage";
export type CHAT_GROUP_MANAGE = typeof CHAT_GROUP_MANAGE;

export const CHAT_GROUP_TRAVERSE = "chat-group:traverse";
export type CHAT_GROUP_TRAVERSE = typeof CHAT_GROUP_TRAVERSE;

export const CHAT_THREAD_ACCESS = "chat-thread:access";
export type CHAT_THREAD_ACCESS = typeof CHAT_THREAD_ACCESS;

export type ApplicationScope = CHAT_GROUP_ACCESS | CHAT_GROUP_MANAGE | CHAT_GROUP_TRAVERSE | CHAT_THREAD_ACCESS;