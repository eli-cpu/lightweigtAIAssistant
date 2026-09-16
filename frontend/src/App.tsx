import { useState, useRef, useEffect } from 'react';
import { 
  Menu, Plus, MessageSquare, Settings, Search, 
  Send, Mic, ImagePlus, Bot, Loader2, MoreVertical, Trash2, Edit2, LogOut
} from 'lucide-react';
import type { Chat, Message } from './types';
import Login from './Login';
import { chatApi, authApi } from './api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChat = chats.find(c => c.id === currentChatId);

  // Check Auth on mount
  useEffect(() => {
    authApi.getMe()
      .then(userData => {
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isLoading]);

  // Load chat list
  useEffect(() => {
    if (!isAuthenticated) return;
    
    chatApi.getChats()
      .then(data => {
        const loadedChats: Chat[] = data.map((c: any) => ({
          id: c.id.toString(),
          title: c.name,
          updatedAt: new Date(),
          messages: [],
        }));
        loadedChats.sort((a, b) => Number(b.id) - Number(a.id));
        setChats(loadedChats);
      })
      .catch(console.error);
  }, [isAuthenticated]);

  // Load chat history when switching chats
  useEffect(() => {
    if (!currentChatId || !isAuthenticated) return;
    
    const current = chats.find(c => c.id === currentChatId);
    if (current && current.messages.length === 0) {
      chatApi.getChatHistory(currentChatId)
        .then(data => {
          const messagesData = Array.isArray(data) ? data[0]?.messages : data?.messages;
          if (messagesData) {
            setChats(prev => prev.map(c => 
              c.id === currentChatId ? { ...c, messages: messagesData } : c
            ));
          }
        })
        .catch(console.error);
    }
  }, [currentChatId, isAuthenticated, chats]);

  const handleNewChat = () => {
    setCurrentChatId(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput('');
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    try {
      if (!currentChatId) {
        // Optimistic UI for new chat
        const tempId = Date.now().toString();
        const newChat: Chat = {
          id: tempId,
          title: content.slice(0, 30) + '...',
          updatedAt: new Date(),
          messages: [userMessage],
        };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(tempId);

        // API Call
        const { data } = await chatApi.createChat([userMessage]);
        
        // Replace temp chat with real chat
        setChats(prev => prev.map(c => c.id === tempId ? {
          id: data.id.toString(),
          title: data.name,
          updatedAt: new Date(),
          messages: data.messages
        } : c));
        setCurrentChatId(data.id.toString());
      } else {
        // Optimistic UI for existing chat
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date() }
            : chat
        ));

        // API Call
        const response = await chatApi.chatCompletion(currentChatId, [userMessage]);
        
        // Update with full history from backend
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: response.chat.messages }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error in chat flow:', error);
      // Fallback Error Message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: "Error communicating with backend API.",
      };
      setChats(prev => prev.map(chat => 
        chat.id === (currentChatId || prev[0].id)
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await chatApi.deleteChat(id);
      setChats(prev => prev.filter(c => c.id !== id));
      if (currentChatId === id) setCurrentChatId(null);
    } catch (err) {
      console.error("Failed to delete", err);
    }
    setMenuOpenId(null);
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await chatApi.updateChatName(id, editTitle.trim());
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c));
    } catch (err) {
      console.error("Failed to rename", err);
    }
    setEditingChatId(null);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch(e) {}
    setIsAuthenticated(false);
    setUser(null);
    setChats([]);
    setCurrentChatId(null);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gemini-bg flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {
      setIsAuthenticated(true);
      authApi.getMe().then(setUser);
    }} />;
  }

  return (
    <div className="flex h-screen bg-gemini-bg text-gemini-text-primary overflow-hidden font-sans" onClick={() => setMenuOpenId(null)}>
      
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0 opacity-0 md:w-16 md:opacity-100'
        } transition-all duration-300 ease-in-out bg-gemini-sidebar flex flex-col border-r border-gemini-sidebar-hover shrink-0 relative z-20`}
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
          <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
            <h3 className="text-xs font-semibold text-gemini-text-secondary mb-3 px-2">Recent</h3>
            <div className="space-y-1">
              {chats.map(chat => (
                <div key={chat.id} className="relative">
                  <div
                    onClick={() => setCurrentChatId(chat.id)}
                    className={`group flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg transition-colors cursor-pointer text-sm ${
                      currentChatId === chat.id ? 'bg-gemini-sidebar-hover text-white' : 'hover:bg-gemini-sidebar-hover text-gemini-text-primary'
                    }`}
                  >
                    <MessageSquare size={16} className="shrink-0 text-gemini-text-secondary" />
                    
                    {editingChatId === chat.id ? (
                      <input 
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameSubmit(chat.id)}
                        onKeyDown={e => e.key === 'Enter' && handleRenameSubmit(chat.id)}
                        className="bg-transparent border-b border-[#a8c7fa] outline-none w-full text-white"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate flex-1">{chat.title}</span>
                    )}

                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === chat.id ? null : chat.id); }}
                      className={`p-1 rounded hover:bg-[#333538] text-gemini-text-secondary opacity-0 group-hover:opacity-100 ${menuOpenId === chat.id ? 'opacity-100 bg-[#333538]' : ''} transition-opacity`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  {menuOpenId === chat.id && (
                    <div className="absolute right-0 top-10 w-32 bg-[#282a2c] rounded-xl shadow-xl border border-gemini-sidebar-hover overflow-hidden z-50 py-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditTitle(chat.title);
                          setMenuOpenId(null);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gemini-sidebar-hover text-left text-gemini-text-primary"
                      >
                        <Edit2 size={14} /> Rename
                      </button>
                      <button 
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gemini-sidebar-hover text-left text-[#ff5546]"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isSidebarOpen && (
          <div className="p-3 border-t border-gemini-sidebar-hover mt-auto space-y-1">
            <button className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg hover:bg-gemini-sidebar-hover transition-colors text-sm text-gemini-text-primary">
              <Settings size={18} className="text-gemini-text-secondary" />
              <span>Settings</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg hover:bg-[#3f2121] transition-colors text-sm text-[#ff5546]">
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-gemini-bg z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 text-lg font-medium">
            <span className="text-[#a8c7fa]">Gemini</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gemini-text-secondary mr-2">
              {user?.username && `Hi, ${user.username}`}
            </div>
            <button className="text-gemini-text-secondary hover:bg-gemini-sidebar-hover p-2 rounded-full transition-colors">
              <Search size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-medium text-white cursor-pointer select-none">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 custom-scrollbar">
          {!currentChat || currentChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto mt-[-10vh]">
              <h1 className="text-4xl md:text-5xl font-semibold mb-8 bg-gradient-to-r from-[#4b90ff] to-[#ff5546] text-transparent bg-clip-text pb-2 text-center">
                Hello, {user?.username || 'User'}
              </h1>
              <p className="text-xl text-gemini-text-secondary text-center mb-12">How can I help you today?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div onClick={() => setInput("Write a thank you note to my colleague")} className="bg-gemini-sidebar p-4 rounded-xl cursor-pointer hover:bg-gemini-sidebar-hover transition-colors border border-gemini-sidebar-hover">
                  <p className="text-sm text-gemini-text-primary mb-2">Write a thank you note to my colleague</p>
                </div>
                <div onClick={() => setInput("Plan a healthy meal for the week")} className="bg-gemini-sidebar p-4 rounded-xl cursor-pointer hover:bg-gemini-sidebar-hover transition-colors border border-gemini-sidebar-hover">
                  <p className="text-sm text-gemini-text-primary mb-2">Plan a healthy meal for the week</p>
                </div>
                <div onClick={() => setInput("Help me write a Python script")} className="bg-gemini-sidebar p-4 rounded-xl cursor-pointer hover:bg-gemini-sidebar-hover transition-colors border border-gemini-sidebar-hover">
                  <p className="text-sm text-gemini-text-primary mb-2">Help me write a Python script</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 pt-6">
              {currentChat.messages.map((message) => (
                <div key={message.id || Math.random().toString()} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-1 text-white text-xs select-none">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
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
