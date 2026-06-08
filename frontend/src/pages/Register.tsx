import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password) return;
    
    const isSuccess = await register(email, name, password);
    if (isSuccess) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] relative flex items-center justify-center px-4 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-25%] left-[-20%] w-[55%] h-[55%] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[55%] h-[55%] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl relative z-10 border border-slate-800/80">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4 animate-pulse">
            <Sparkles className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create your account</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Start cleaning and analyzing datasets in seconds
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 text-xs font-semibold text-center leading-relaxed">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl px-4 py-3 text-xs font-semibold text-center leading-relaxed">
              Registration successful! Redirecting to login...
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full glass-input rounded-2xl pl-12 pr-4 py-3.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full glass-input rounded-2xl pl-12 pr-4 py-3.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-2xl pl-12 pr-4 py-3.5 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Register workspace
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <p className="text-xs text-slate-400 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 hover:underline font-bold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
