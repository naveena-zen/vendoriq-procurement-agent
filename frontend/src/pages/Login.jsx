import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../api/client';
import { KeyRound, ArrowRight, Sparkles } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Radial glow behind card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, #8B5CF6 50%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo above card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-brand shadow-glow-blue mb-4">
            <span className="font-display font-bold text-white text-xl">P</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">ProcureIQ</h1>
          <p className="text-text-muted text-xs mt-1">Vendor Proposal Intelligence Agent</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-elevated border border-surface-border rounded-2xl p-8 shadow-card">
          <h2 className="font-display text-base font-semibold text-text-primary mb-6">Sign in to your workspace</h2>

          {error && (
            <div className="mb-5 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Access Passcode
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-text-faint" />
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode…"
                  className="w-full bg-surface-card border border-surface-border rounded-lg py-2.5 pl-10 pr-4 text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all placeholder:text-text-faint"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-brand text-white font-semibold text-sm py-2.5 px-4 rounded-lg shadow-glow-blue hover:shadow-glow-violet transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : 'Access Command Center'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center border-t border-surface-divider pt-5">
            <button
              type="button"
              onClick={() => setPasscode('procure123')}
              className="text-xs text-accent-aiSignal hover:text-accent-violet inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill demo passcode: <span className="font-mono underline">procure123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
