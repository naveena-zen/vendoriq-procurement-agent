import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProjects } from '../api/client';
import { Plus, FileText, CheckCircle2, Clock, Shield, ArrowRight, Layers, Award } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 rounded-xl text-white shadow-md shadow-brand-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">ProcureIQ</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full border border-brand-200">
                Vendor Proposal Agent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/project/new"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Section */}
        <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 border border-brand-400/30 rounded-full text-xs font-medium text-brand-300 mb-3">
              <Award className="w-3.5 h-3.5" /> AI Proposal Intelligence Suite
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Automated RFP Proposal Intelligence & Vendor Negotiation
            </h1>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Upload PDF and DOCX proposals. Automatically extract commercial terms, score technical compliance, detect hidden contract risks with redline fixes, and run real-time what-if simulations.
            </p>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Procurement Evaluation Projects</h2>
            <p className="text-sm text-slate-500">Select a project to review intelligence report or create a new evaluation</p>
          </div>
          <button
            onClick={loadProjects}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Refresh Projects
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Projects Found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-6">
              Create your first procurement project to upload vendor proposals and run AI intelligence analysis.
            </p>
            <Link
              to="/project/new"
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const isApproved = proj.approval && proj.approval.status === 'APPROVED & SIGNED';
              return (
                <div
                  key={proj.id}
                  className="bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors text-base line-clamp-1">
                        {proj.name}
                      </h3>
                      {isApproved ? (
                        <span className="shrink-0 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Signed
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.vendor_count} Vendor Proposals</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.created_at}</span>
                      </div>
                    </div>

                    {proj.summary && proj.summary.text && (
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-6 italic">
                        "{proj.summary.text}"
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/project/${proj.id}/report`}
                    className="w-full bg-slate-900 hover:bg-brand-600 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    View Report & Dashboard
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
