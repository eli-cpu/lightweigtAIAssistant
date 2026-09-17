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

const processStream = async (
  res: Response, 
  onChunk: (content: string) => void,
  onChatInfo?: (chatData: any) => void,
  onNameUpdate?: (name: string) => void
) => {
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ""; // keep incomplete line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') continue;
        
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'chunk') onChunk(data.content);
          else if (data.type === 'chat_info' && onChatInfo) onChatInfo(data.chat);
          else if (data.type === 'name_update' && onNameUpdate) onNameUpdate(data.name);
          else if (data.type === 'error') throw new Error(data.message);
        } catch (e) {
          // ignore parse errors for partial chunks if any
        }
      }
    }
  }
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
  createChat: async (messages: Message[], onChunk: (content: string) => void, onChatInfo?: (chatData: any) => void, onNameUpdate?: (name: string) => void) => {
    const res = await fetchWithCreds('/chat/new', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error("Failed to create chat");
    
    return processStream(res, onChunk, onChatInfo, onNameUpdate);
  },
  chatCompletion: async (id: string, messages: Message[], onChunk: (content: string) => void) => {
    const res = await fetchWithCreds(`/chat/completion?id=${id}`, {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error("Failed to get completion");
    
    return processStream(res, onChunk);
  },
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
