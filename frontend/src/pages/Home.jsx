import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProjects } from '../api/client';
import { Plus, FileText, CheckCircle2, Clock, Shield, ArrowRight, Layers, Sparkles } from 'lucide-react';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError('Could not connect to backend server. Make sure FastAPI server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-level-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-brand-indigo rounded-lg border border-indigo-100 shadow-sm">
              <Shield className="w-5 h-5 text-brand-indigo" />
            </div>
            <div>
              <span className="font-display font-semibold text-lg text-slate-900 tracking-tight">ProcureIQ</span>
              <span className="ml-2 text-xs font-medium px-2.5 py-0.5 bg-indigo-50 text-brand-indigo rounded-full border border-indigo-100">
                Vendor Proposal Agent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/project/new"
              className="bg-brand-indigo hover:bg-brand-indigoHover text-white font-medium text-xs px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Section */}
        <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-level-2 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-medium text-indigo-300 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-ai-accent" /> AI Sourcing & Vendor Decision Engine
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Automated RFP Proposal Intelligence & Vendor Negotiation
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed max-w-2xl">
              Upload PDF and DOCX proposals. Automatically extract commercial terms, score technical compliance, detect hidden contract risks with redline fixes, and run real-time what-if simulations.
            </p>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">Procurement Evaluation Projects</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a project to review intelligence report or create a new evaluation</p>
          </div>
          <button
            onClick={loadProjects}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-level-1 transition-all"
          >
            Refresh Projects
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 shadow-level-1 animate-pulse space-y-4">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center shadow-level-1">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-900">No Projects Found</h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 mb-6">
              Create your first procurement project to upload vendor proposals and run AI intelligence analysis.
            </p>
            <Link
              to="/project/new"
              className="bg-brand-indigo hover:bg-brand-indigoHover text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const isApproved = proj.approval && proj.approval.status === 'APPROVED & SIGNED';
              const isAnalyzed = !!proj.summary;
              
              // Top colored status strip
              const stripColor = isApproved ? 'bg-emerald-600' : isAnalyzed ? 'bg-brand-indigo' : 'bg-slate-300';

              return (
                <div
                  key={proj.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-level-1 hover:shadow-level-2 hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between overflow-hidden group relative"
                >
                  {/* Top Status Strip */}
                  <div className={`h-1 w-full ${stripColor}`} />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-display font-semibold text-slate-900 group-hover:text-brand-indigo transition-colors text-base line-clamp-1">
                        {proj.name}
                      </h3>
                      {isApproved ? (
                        <span className="shrink-0 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-5">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.vendor_count} Proposals</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.created_at}</span>
                      </div>
                    </div>

                    {proj.summary && proj.summary.text && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                          "{proj.summary.text}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-6 pb-6 pt-0">
                    <Link
                      to={`/project/${proj.id}/report`}
                      className="w-full bg-slate-900 hover:bg-brand-indigo text-white text-xs font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      View Report & Dashboard
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
