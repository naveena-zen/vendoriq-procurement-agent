import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../api/client';
import { Shield, KeyRound, ArrowRight, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-[400px] w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-level-2 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-brand-indigo rounded-xl mb-3 border border-indigo-100 shadow-sm">
            <Shield className="w-7 h-7 text-brand-indigo" />
          </div>
          <h1 className="font-display text-[24px] font-semibold text-brand-indigo tracking-tight">
            ProcureIQ
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Vendor Proposal Intelligence Agent
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Passcode or Access Key
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (e.g. procure123)"
                className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-indigo hover:bg-brand-indigoHover text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Intelligence Portal'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleDemoAccess}
            className="text-xs text-brand-indigo hover:text-brand-indigoHover inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-ai-accent" />
            Click to fill Demo Passcode: <span className="underline font-mono">procure123</span>
          </button>
        </div>
      </div>
    </div>
  );
}
