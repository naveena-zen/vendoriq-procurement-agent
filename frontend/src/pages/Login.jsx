import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../api/client';
import { ShieldCheck, KeyRound, ArrowRight, Sparkles } from 'lucide-react';

export default function Login({ setAuth }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(passcode);
      localStorage.setItem('procureiq_token', data.token);
      localStorage.setItem('procureiq_user', data.user);
      setAuth(true);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid passcode or login credential');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    setPasscode('procure123');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-brand-600/20 text-brand-400 rounded-xl mb-4 border border-brand-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ProcureIQ</h1>
          <p className="text-slate-400 text-sm mt-1">Vendor Proposal Intelligence Agent</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Passcode or Magic Link Email
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (e.g. procure123)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Intelligence Portal'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-700/60 pt-5">
          <button
            type="button"
            onClick={handleDemoAccess}
            className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Click to fill Demo Passcode: <span className="underline font-mono">procure123</span>
          </button>
        </div>
      </div>
    </div>
  );
}
