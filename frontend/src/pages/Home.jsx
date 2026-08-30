import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, Clock, AlertTriangle, DollarSign, BarChart2, Users, ArrowRight } from 'lucide-react';

// ─── KPI Stat Card ─────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, valueClass = '', iconBg = 'bg-accent-blue/10', iconColor = 'text-accent-blue', badge, badgeColor }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-card hover:border-surface-borderHover hover:shadow-glow-blue/5 transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {badge !== undefined && (
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${badgeColor || 'bg-surface-border text-text-muted'}`}>
            {badge}
          </span>
        )}
      </div>
      <p className={`font-mono text-2xl font-bold ${valueClass || 'text-text-primary'}`}>{value}</p>
      <p className="text-text-faint text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
}

export default function Home({ projects = [], reloadProjects }) {
  const [loading] = useState(false);

  // Aggregate KPIs across all projects
  const totalContractValue = projects.reduce((sum, p) => {
    const vendors = p.vendors || [];
    return sum + vendors.reduce((s, v) => s + (v.extraction?.pricing?.totalCost || 0), 0);
  }, 0);

  const allScores = projects.flatMap(p =>
    (p.vendors || []).map(v => v.compliance_score).filter(Boolean)
  );
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const vendorCount = projects.reduce((sum, p) => sum + (p.vendor_count || 0), 0);
  const highRisks = projects.reduce((sum, p) => {
    return sum + (p.vendors || []).reduce((s, v) => {
      return s + (v.risks || []).filter(r => r.severity === 'High').length;
    }, 0);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Procurement Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5">AI-powered sourcing intelligence across all active RFPs</p>
        </div>
        <Link
          to="/project/new"
          className="bg-gradient-brand text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-glow-blue hover:shadow-glow-violet transition-all inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      {/* KPI Stat Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Total Contract Value"
          value={totalContractValue > 0 ? `$${(totalContractValue / 1000).toFixed(0)}k` : '—'}
          iconBg="bg-accent-blue/10"
          iconColor="text-accent-blue"
        />
        <KpiCard
          icon={BarChart2}
          label="Avg. Compliance Score"
          value={avgScore > 0 ? `${avgScore}%` : '—'}
          valueClass="text-gradient"
          iconBg="bg-accent-violet/10"
          iconColor="text-accent-violet"
        />
        <KpiCard
          icon={Users}
          label="Vendors Under Review"
          value={vendorCount || '—'}
          iconBg="bg-success/10"
          iconColor="text-success"
        />
        <KpiCard
          icon={AlertTriangle}
          label="High-Severity Risks"
          value={highRisks}
          valueClass={highRisks > 0 ? 'text-danger' : 'text-success'}
          iconBg={highRisks > 0 ? 'bg-danger/10' : 'bg-success/10'}
          iconColor={highRisks > 0 ? 'text-danger' : 'text-success'}
          badge={highRisks > 0 ? 'FLAGGED' : 'CLEAR'}
          badgeColor={highRisks > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}
        />
      </div>

      {/* Projects Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm font-semibold text-text-primary">Active Evaluation Projects</h2>
          <button
            onClick={reloadProjects}
            className="text-xs font-medium text-text-muted hover:text-text-primary bg-surface-card border border-surface-border px-3 py-1.5 rounded-lg hover:bg-surface-cardHover transition-all"
          >
            Refresh
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-surface-card border border-surface-border border-dashed rounded-2xl p-12 text-center shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4 shadow-glow-blue">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-display text-base font-semibold text-text-primary">No Projects Found</h3>
            <p className="text-text-muted text-xs max-w-xs mx-auto mt-1 mb-5 leading-relaxed">
              Create your first procurement evaluation project to upload vendor proposals and run AI intelligence analysis.
            </p>
            <Link
              to="/project/new"
              className="bg-gradient-brand text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-glow-blue inline-flex items-center gap-2 hover:shadow-glow-violet transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((proj) => {
              const isApproved = proj.approval?.status === 'APPROVED & SIGNED';
              const isAnalyzed = !!proj.summary;
              const stripClass = isApproved
                ? 'bg-gradient-to-r from-success to-emerald-400'
                : isAnalyzed
                ? 'bg-gradient-brand'
                : 'bg-surface-divider';

              return (
                <div
                  key={proj.id}
                  className="bg-surface-card border border-surface-border rounded-2xl shadow-card hover:shadow-glow-blue/10 hover:border-surface-borderHover hover:-translate-y-0.5 transition-all duration-150 flex flex-col overflow-hidden group"
                >
                  {/* Top status strip */}
                  <div className={`h-[3px] w-full ${stripClass}`} />

                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-display font-semibold text-text-primary text-sm group-hover:text-accent-blue transition-colors line-clamp-2">
                        {proj.name}
                      </h3>
                      {isApproved ? (
                        <span className="shrink-0 px-2 py-0.5 bg-success/10 text-success border border-success/20 text-[10px] font-semibold rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Signed
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 bg-surface-border text-text-faint text-[10px] font-medium rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-text-faint mb-4">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        <span>{proj.vendor_count} Proposals</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{proj.created_at}</span>
                      </div>
                    </div>

                    {proj.summary?.text && (
                      <p className="text-[11px] text-text-muted line-clamp-2 italic leading-relaxed border-l-2 border-accent-violet/30 pl-2">
                        {proj.summary.text}
                      </p>
                    )}
                  </div>

                  <div className="px-5 pb-5">
                    <Link
                      to={`/project/${proj.id}/report`}
                      className="w-full bg-gradient-brand text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-glow-blue hover:shadow-glow-violet transition-all"
                    >
                      View Intelligence Report
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
