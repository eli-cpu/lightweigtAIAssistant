import { useState } from 'react';
import { Bot, Lock, Mail, Loader2, ArrowRight, User } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      const body = isSignup 
        ? { username, email, password } 
        : { username, password };

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to verify credentials. Please check your details or ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gemini-bg flex items-center justify-center p-4 font-sans text-gemini-text-primary">
      <div className="max-w-md w-full bg-gemini-sidebar border border-gemini-sidebar-hover rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#4b90ff] to-[#ff5546] rounded-xl flex items-center justify-center mb-4">
            <Bot size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">{isSignup ? 'Create an account' : 'Sign in to Gemini'}</h1>
          <p className="text-sm text-gemini-text-secondary mt-2 text-center">
            {isSignup ? 'Enter your details to register' : 'Enter your credentials to access the assistant'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gemini-text-secondary mb-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gemini-text-secondary" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-gemini-input-bg border border-gemini-input-border rounded-xl text-white placeholder-gemini-text-secondary focus:outline-none focus:ring-1 focus:ring-[#a8c7fa] focus:border-[#a8c7fa] transition-colors"
                placeholder="johndoe"
              />
            </div>
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gemini-text-secondary mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gemini-text-secondary" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-gemini-input-bg border border-gemini-input-border rounded-xl text-white placeholder-gemini-text-secondary focus:outline-none focus:ring-1 focus:ring-[#a8c7fa] focus:border-[#a8c7fa] transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gemini-text-secondary mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gemini-text-secondary" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-gemini-input-bg border border-gemini-input-border rounded-xl text-white placeholder-gemini-text-secondary focus:outline-none focus:ring-1 focus:ring-[#a8c7fa] focus:border-[#a8c7fa] transition-colors"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="text-[#ff5546] text-sm bg-[#ff5546]/10 p-3 rounded-lg border border-[#ff5546]/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username || !password || (isSignup && !email)}
            className="w-full flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                {isSignup ? 'Sign Up' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gemini-sidebar-hover text-center">
          <p className="text-sm text-gemini-text-secondary">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            className="mt-3 w-full py-2.5 px-4 rounded-xl font-medium border border-gemini-input-border text-white bg-gemini-input-bg hover:bg-gemini-sidebar-hover transition-colors"
          >
            {isSignup ? 'Sign in instead' : 'Create an account'}
          </button>
        </div>
      </div>
    </div>
  );
}
