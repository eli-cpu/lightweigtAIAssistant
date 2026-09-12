import { useState, useRef, useEffect } from 'react';
import { 
  Menu, Plus, MessageSquare, Settings, Search, 
  Send, Mic, ImagePlus, Bot, Loader2
} from 'lucide-react';
import type { Chat, Message } from './types';
import Login from './Login';

const API_BASE_URL = 'http://localhost:3000'; // Assuming API routes are mounted at root or change to /api if needed

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentChat = chats.find(c => c.id === currentChatId);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isLoading]);

  // Load chat list on mount (if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/database/chats`, {
          headers: { ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          // Map backend data {id, name} to frontend Chat type
          const loadedChats: Chat[] = data.map((c: any) => ({
            id: c.id.toString(),
            title: c.name,
            updatedAt: new Date(),
            messages: [], // messages will be loaded on demand
          }));
          // Sort by ID descending (newest first)
          loadedChats.sort((a, b) => Number(b.id) - Number(a.id));
          setChats(loadedChats);
        }
      } catch (error) {
        console.error("Failed to load chats:", error);
      }
    };
    fetchChats();
  }, [isAuthenticated, authToken]);

  // Load chat history when switching chats
  useEffect(() => {
    if (!currentChatId || !isAuthenticated) return;
    
    const current = chats.find(c => c.id === currentChatId);
    if (current && current.messages.length === 0) {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/database/chats/${currentChatId}`, {
            headers: { ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }
          });
          if (res.ok) {
            const data = await res.json();
            // Supabase returns an array for .eq() without .single()
            const messagesData = Array.isArray(data) ? data[0]?.messages : data?.messages;
            if (messagesData) {
              setChats(prev => prev.map(c => 
                c.id === currentChatId ? { ...c, messages: messagesData } : c
              ));
            }
          }
        } catch (error) {
          console.error("Failed to load chat history:", error);
        }
      };
      fetchHistory();
    }
  }, [currentChatId, isAuthenticated]);

  const handleNewChat = () => {
    setCurrentChatId(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    let chatId = currentChatId;
    let isNewChat = !chatId;
    
    // Create local optimistic update
    if (isNewChat) {
      chatId = Date.now().toString(); // Temporary ID until backend gives real one if needed
      const newChat: Chat = {
        id: chatId,
        title: userMessage.content.slice(0, 30) + '...',
        updatedAt: new Date(),
        messages: [userMessage],
      };
      setChats([newChat, ...chats]);
      setCurrentChatId(chatId);
    } else {
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    }

    setInput('');
    setIsLoading(true);

    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    };

    try {
      // 1. Get current full message array for saving
      const chatToUpdate = chats.find(c => c.id === chatId);
      const updatedMessages = chatToUpdate ? [...chatToUpdate.messages, userMessage] : [userMessage];

      // 2. Save history to database
      if (isNewChat) {
        // Send to POST /database/chats
        const res = await fetch(`${API_BASE_URL}/database/chats`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages: updatedMessages }),
        });
        
        if (res.ok) {
          try {
            const data = await res.json();
            if (data && data.id) {
              const realId = data.id.toString();
              // Swap the temporary ID with the real ID from the backend
              setChats(prev => prev.map(c => c.id === chatId ? { ...c, id: realId } : c));
              setCurrentChatId(realId);
              chatId = realId; // Update local variable for the LLM step below
            }
          } catch (e) {
            // Backend might have just sent 200 OK without JSON if not updated yet
          }
        }
      } else {
        // Send to PUT /database/chats/:id/history
        await fetch(`${API_BASE_URL}/database/chats/${chatId}/history`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ messages: updatedMessages }),
        });
      }

      // 3. Ask LLM for reply
      const response = await fetch(`${API_BASE_URL}/llm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get LLM response');
      }

      const data = await response.json();
      
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.reply || 'No reply received from LLM',
      };

      // Append LLM reply
      const finalMessages = [...updatedMessages, modelMessage];
      
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, messages: finalMessages };
        }
        return chat;
      }));

      // 4. Update history in database with LLM reply
      await fetch(`${API_BASE_URL}/database/chats/${chatId}/history`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ messages: finalMessages }),
      });
      
    } catch (error) {
      console.error('Error in chat flow:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Error communicating with backend API.",
      };
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, messages: [...chat.messages, errorMessage] };
        }
        return chat;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gemini-bg text-gemini-text-primary overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0 opacity-0 md:w-16 md:opacity-100'
        } transition-all duration-300 ease-in-out bg-gemini-sidebar flex flex-col border-r border-gemini-sidebar-hover shrink-0`}
      >
        <div className="p-3 flex items-center justify-between">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gemini-sidebar-hover rounded-full text-gemini-text-secondary transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="px-3 pb-4 pt-2">
          <button 
            onClick={handleNewChat}
            className={`flex items-center gap-2 bg-gemini-sidebar-hover hover:bg-[#333538] transition-colors rounded-full py-2 ${isSidebarOpen ? 'px-4' : 'px-2 justify-center'} w-full text-sm font-medium`}
          >
            <Plus size={20} className="text-gemini-text-secondary" />
            {isSidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <h3 className="text-xs font-semibold text-gemini-text-secondary mb-3 px-2">Recent</h3>
            <div className="space-y-1">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setCurrentChatId(chat.id)}
                  className={`flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg transition-colors truncate text-sm ${
                    currentChatId === chat.id ? 'bg-gemini-sidebar-hover text-white' : 'hover:bg-gemini-sidebar-hover text-gemini-text-primary'
                  }`}
                >
                  <MessageSquare size={16} className="shrink-0 text-gemini-text-secondary" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isSidebarOpen && (
          <div className="p-3 border-t border-gemini-sidebar-hover mt-auto">
            <button className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg hover:bg-gemini-sidebar-hover transition-colors text-sm text-gemini-text-primary">
              <Settings size={18} className="text-gemini-text-secondary" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-gemini-bg">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 text-lg font-medium">
            <span className="text-[#a8c7fa]">Gemini</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gemini-text-secondary hover:bg-gemini-sidebar-hover p-2 rounded-full transition-colors">
              <Search size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-medium text-white cursor-pointer">
              U
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
          {!currentChat || currentChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto mt-[-10vh]">
              <h1 className="text-4xl md:text-5xl font-semibold mb-8 bg-gradient-to-r from-[#4b90ff] to-[#ff5546] text-transparent bg-clip-text pb-2 text-center">
                Hello, User
              </h1>
              <p className="text-xl text-gemini-text-secondary text-center mb-12">How can I help you today?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="bg-gemini-sidebar p-4 rounded-xl cursor-pointer hover:bg-gemini-sidebar-hover transition-colors border border-gemini-sidebar-hover">
                  <p className="text-sm text-gemini-text-primary mb-2">Write a thank you note to my colleague</p>
                </div>
                <div className="bg-gemini-sidebar p-4 rounded-xl cursor-pointer hover:bg-gemini-sidebar-hover transition-colors border border-gemini-sidebar-hover">
                  <p className="text-sm text-gemini-text-primary mb-2">Plan a healthy meal for the week</p>
                </div>
                <div className="bg-gemini-sidebar p-4 rounded-xl cursor-pointer hover:bg-gemini-sidebar-hover transition-colors border border-gemini-sidebar-hover">
                  <p className="text-sm text-gemini-text-primary mb-2">Help me write a Python script</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 pt-6">
              {currentChat.messages.map((message) => (
                <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center shrink-0 mt-1">
                      <Bot size={18} className="text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                    message.role === 'user' 
                      ? 'bg-gemini-user-msg text-white rounded-br-sm' 
                      : 'bg-transparent text-gemini-text-primary'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-1 text-white text-xs">
                      U
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center shrink-0 mt-1">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="px-5 py-3 flex items-center">
                    <Loader2 className="w-5 h-5 text-[#a8c7fa] animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gemini-bg via-gemini-bg to-transparent pt-6 pb-6 px-4 md:px-8">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-gemini-input-bg border border-gemini-input-border rounded-3xl p-2 pl-4 focus-within:bg-[#282a2c] focus-within:border-[#a8c7fa] transition-colors">
              <button type="button" className="p-2 text-gemini-text-secondary hover:text-white transition-colors rounded-full hover:bg-gemini-sidebar-hover shrink-0 mb-1">
                <ImagePlus size={20} />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Enter a prompt here"
                className="flex-1 max-h-[200px] bg-transparent border-none outline-none resize-none py-3 text-gemini-text-primary placeholder:text-gemini-text-secondary custom-scrollbar"
                rows={1}
                style={{ minHeight: '48px' }}
              />
              
              <div className="flex items-center gap-1 mb-1 shrink-0">
                {input.trim() ? (
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="p-2 text-white bg-gemini-sidebar-hover rounded-full hover:bg-[#333538] transition-colors disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                ) : (
                  <button type="button" className="p-2 text-gemini-text-secondary hover:text-white transition-colors rounded-full hover:bg-gemini-sidebar-hover">
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </form>
            <div className="text-center mt-3">
              <span className="text-xs text-gemini-text-secondary">
                Gemini may display inaccurate info, including about people, so double-check its responses.
              </span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
