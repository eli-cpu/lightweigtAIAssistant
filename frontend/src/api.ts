import type { Message } from './types';

const API_BASE_URL = 'http://localhost:3000';

const fetchWithCreds = async (url: string, options: RequestInit = {}) => {
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

export const chatApi = {
  getChats: () => fetchWithCreds('/database/chats').then(res => {
    if (!res.ok) throw new Error("Failed to load chats");
    return res.json();
  }),
  getChatHistory: (id: string) => fetchWithCreds(`/database/chats/history?id=${id}`).then(res => {
    if (!res.ok) throw new Error("Failed to load history");
    return res.json();
  }),
  createChat: (messages: Message[]) => fetchWithCreds('/chat/new', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  }).then(res => {
    if (!res.ok) throw new Error("Failed to create chat");
    return res.json();
  }),
  chatCompletion: (id: string, messages: Message[]) => fetchWithCreds(`/chat/completion?id=${id}`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  }).then(res => {
    if (!res.ok) throw new Error("Failed to get completion");
    return res.json();
  }),
  deleteChat: (id: string) => fetchWithCreds(`/database/chats?id=${id}`, {
    method: 'DELETE',
  }).then(res => {
    if (!res.ok) throw new Error("Failed to delete chat");
    return res.json();
  }),
  updateChatName: (id: string, name: string) => fetchWithCreds(`/database/chats/name?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  }).then(res => {
    if (!res.ok) throw new Error("Failed to rename chat");
    return res.json();
  })
};

export const authApi = {
  logout: () => fetchWithCreds('/auth/logout', { method: 'POST' }).then(res => res.json()),
  getMe: () => fetchWithCreds('/auth/me').then(res => res.ok ? res.json() : null),
};
