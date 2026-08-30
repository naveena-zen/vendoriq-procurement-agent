import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProjectDetails, getExportUrl, approveProjectApi, saveVendorNoteApi, sendChatQuestion } from '../api/client';
import { calculateVendorScore } from '../lib/scoring';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import {
  ArrowLeft, Download, ShieldCheck, CheckCircle2, Sliders, AlertTriangle,
  FileText, FileSpreadsheet, Copy, Check, MessageSquare, Send, ChevronDown,
  ChevronUp, Bot, Sparkles, Clock, Edit3, DollarSign, Award, ExternalLink,
  X, BarChart2, Users, TrendingDown
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, valueClass = '', iconBg = 'bg-accent-blue/10', iconColor = 'text-accent-blue', badge, badgeColor }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-card hover:border-surface-borderHover transition-all duration-150">
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

// Sub-score mini sparkline bars for vendor cards
function SubScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-text-faint w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-divider rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-text-muted w-7 text-right">{Math.round(value)}</span>
    </div>
  );
}

// Reviewer avatar stack from approvalData + vendor notes
function AvatarStack({ approvalData, vendors }) {
  const names = [];
  if (approvalData?.approvedBy) names.push(approvalData.approvedBy);
  vendors?.forEach(v => { if (v.notes && v.notes.trim()) names.push('Analyst'); });
  const unique = [...new Set(names)].slice(0, 4);
  const overflow = names.length > 4 ? names.length - 4 : 0;

  if (unique.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {unique.map((name, idx) => (
          <div key={idx} className="w-7 h-7 rounded-full bg-gradient-brand border-2 border-surface-bg flex items-center justify-center text-white font-mono text-[9px] font-bold" title={name}>
            {name.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-7 h-7 rounded-full bg-surface-card border-2 border-surface-border flex items-center justify-center text-text-faint font-mono text-[9px] font-bold">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[10px] text-text-faint">{unique.length} reviewer{unique.length > 1 ? 's' : ''}</span>
    </div>
  );
}

// Custom donut tooltip
const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 shadow-card text-xs">
      <p className="font-semibold text-text-primary">{payload[0].name}</p>
      <p className="font-mono text-accent-blue">${payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

// ─── Main Report Component ───────────────────────────────────────────────────────
export default function Report() {
  const { id: projectId } = useParams();
  const chatEndRef = useRef(null);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [simulatorWeights, setSimulatorWeights] = useState({ price: 40, sla: 25, features: 20, support: 15 });
  const [activeEmailModal, setActiveEmailModal] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approvalData, setApprovalData] = useState(null);
  const [vendorNotes, setVendorNotes] = useState({});
  const [savingNotes, setSavingNotes] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{
    sender: 'assistant',
    text: 'Hello! I am ProcureIQ Proposal Assistant. Ask me any question across your uploaded proposals and I will cite the specific vendor sources.',
    vendors: []
  }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const [openRisksVendor, setOpenRisksVendor] = useState(null);
  const [gaugeAnimated, setGaugeAnimated] = useState(false);

  useEffect(() => { loadReport(); }, [projectId]);
  useEffect(() => { if (project) setTimeout(() => setGaugeAnimated(true), 300); }, [project]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchProjectDetails(projectId);
      setProject(data);
      setApprovalData(data.approval);
      if (data.requirements?.weights) setSimulatorWeights(data.requirements.weights);
      const notesMap = {};
      data.vendors?.forEach(v => { notesMap[v.id] = v.notes || ''; });
      setVendorNotes(notesMap);
      if (data.vendors?.length > 0) setOpenRisksVendor(data.vendors[0].id);
    } catch (err) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const evaluatedVendors = useMemo(() => {
    if (!project?.vendors) return [];
    const mustHaves = project.requirements?.mustHaves || [];
    const reScored = project.vendors.map(v => ({
      ...v,
      dynamicScore: calculateVendorScore(v, project.vendors, simulatorWeights, mustHaves),
    }));
    reScored.sort((a, b) => b.dynamicScore - a.dynamicScore);
    return reScored.map((v, i) => ({ ...v, dynamicRank: i + 1 }));
  }, [project, simulatorWeights]);

  // Sub-scores per vendor for sparklines
  const getSubScores = (vendor) => {
    const allVendors = project?.vendors || [];
    const mustHaves = project?.requirements?.mustHaves || [];
    const ext = vendor.extraction || {};
    const allCosts = allVendors.map(v => v.extraction?.pricing?.totalCost).filter(c => c != null);
    const currCost = ext.pricing?.totalCost;
    let priceScore = 50;
    if (currCost != null && allCosts.length > 0) {
      const min = Math.min(...allCosts), max = Math.max(...allCosts);
      priceScore = min === max ? 100 : Math.max(0, Math.min(100, 100 - ((currCost - min) / (max - min)) * 50));
    }
    const uptimeStr = String(ext.sla?.uptimeGuarantee || '');
    const uptimeMatch = uptimeStr.match(/(\d{2}(?:\.\d+)?)/);
    let slaScore = 0;
    if (uptimeMatch) {
      const v = parseFloat(uptimeMatch[1]);
      slaScore = v >= 99.99 ? 100 : v >= 99.95 ? 96 : v >= 99.9 ? 92 : v >= 99.0 ? 80 : Math.max(0, v);
    }
    const vFeats = (ext.features || []).map(f => f.toLowerCase());
    let featScore = mustHaves.length === 0 ? 100 : (() => {
      let m = 0;
      mustHaves.forEach(req => {
        const w = req.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        if (vFeats.some(f => f.includes(req.toLowerCase()))) m += 1;
        else if (w.length > 0 && vFeats.some(f => f.includes(w[0]))) m += 0.8;
        else m += 0.5;
      });
      return Math.min(100, (m / mustHaves.length) * 100);
    })();
    const supStr = String(ext.sla?.supportHours || '').toLowerCase();
    const supScore = supStr.includes('24/7') || supStr.includes('24x7') ? 100 : supStr.includes('business') ? 60 : supStr.length > 0 ? 50 : 0;
    return { price: Math.round(priceScore), sla: Math.round(slaScore), features: Math.round(featScore), support: Math.round(supScore) };
  };

  const handleWeightChange = (key, value) => {
    const val = Math.max(0, Math.min(100, Number(value)));
    const diff = val - simulatorWeights[key];
    const otherKeys = Object.keys(simulatorWeights).filter(k => k !== key);
    const otherSum = otherKeys.reduce((acc, k) => acc + simulatorWeights[k], 0);
    let nw = { ...simulatorWeights, [key]: val };
    if (otherSum > 0 && diff !== 0) otherKeys.forEach(k => { nw[k] = Math.max(0, Math.round((simulatorWeights[k] - diff * (simulatorWeights[k] / otherSum)) * 10) / 10); });
    const total = Object.values(nw).reduce((a, b) => a + b, 0);
    if (total !== 100) nw[otherKeys[0]] = Math.round((nw[otherKeys[0]] + (100 - total)) * 10) / 10;
    setSimulatorWeights(nw);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approverName.trim()) return;
    try { setIsApproving(true); const res = await approveProjectApi(projectId, approverName); setApprovalData(res); loadReport(); }
    catch (err) { alert('Approval failed: ' + err.message); }
    finally { setIsApproving(false); }
  };

  const handleNoteSave = async (vendorId) => {
    try { setSavingNotes({ ...savingNotes, [vendorId]: true }); await saveVendorNoteApi(vendorId, vendorNotes[vendorId]); }
    catch { alert('Failed to save note'); }
    finally { setSavingNotes({ ...savingNotes, [vendorId]: false }); }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatThinking) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: q }]);
    setIsChatThinking(true);
    try {
      const res = await sendChatQuestion(projectId, q);
      setChatMessages(prev => [...prev, { sender: 'assistant', text: res.answer, vendors: res.cited_vendors || [] }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: 'Sorry, I encountered an error searching proposal documents.', vendors: [] }]);
    } finally { setIsChatThinking(false); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto shadow-glow-blue animate-bounce">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <p className="font-display text-sm font-semibold text-text-primary">Loading Intelligence Report…</p>
        <p className="text-text-faint text-xs">Fetching analysis from ProcureIQ engine</p>
      </div>
    </div>
  );

  if (error || !project) return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="bg-surface-card border border-surface-border rounded-2xl p-8 max-w-md text-center shadow-card space-y-4">
        <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
        <h3 className="font-display text-lg font-semibold text-text-primary">Report Unavailable</h3>
        <p className="text-text-muted text-xs">{error || 'Project not found'}</p>
        <Link to="/" className="inline-block bg-gradient-brand text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-glow-blue transition-all">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );

  const topVendor = evaluatedVendors[0];
  const gaugeScore = topVendor?.dynamicScore || 0;
  const gaugeCirc = 2 * Math.PI * 40;
  const gaugeOffset = gaugeAnimated ? gaugeCirc * (1 - gaugeScore / 100) : gaugeCirc;

  // KPI data for this project
  const totalCost = evaluatedVendors.reduce((s, v) => s + (v.extraction?.pricing?.totalCost || 0), 0);
  const avgScore = evaluatedVendors.length > 0 ? Math.round(evaluatedVendors.reduce((s, v) => s + v.dynamicScore, 0) / evaluatedVendors.length) : 0;
  const highRisks = evaluatedVendors.reduce((s, v) => s + (v.risks || []).filter(r => r.severity === 'High').length, 0);

  // Donut chart data
  const donutData = evaluatedVendors
    .filter(v => v.extraction?.pricing?.totalCost)
    .map((v, i) => ({
      name: v.vendor_name,
      value: v.extraction.pricing.totalCost,
      fill: i === 0 ? '#3B82F6' : i === 1 ? '#8B5CF6' : '#F59E0B',
    }));

  // Negotiation impact data (estimated 10-15% reduction post-negotiation)
  const negImpactData = evaluatedVendors.filter(v => v.extraction?.pricing?.totalCost).map(v => ({
    vendor: v.vendor_name.split(' ')[0],
    current: v.extraction.pricing.totalCost,
    postNeg: Math.round(v.extraction.pricing.totalCost * (v.dynamicRank === 1 ? 0.88 : 0.91)),
  }));

  const WEIGHT_LABELS = { price: 'Price', sla: 'SLA', features: 'Features', support: 'Support' };

  return (
    <div className="space-y-8 pb-24">
      {/* ── 1. Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link to="/" className="p-2 text-text-faint hover:text-text-primary hover:bg-surface-card rounded-lg transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-xl text-text-primary truncate">{project.name}</h1>
              {approvalData?.status === 'APPROVED & SIGNED' && (
                <span className="px-2.5 py-0.5 bg-success/10 text-success border border-success/20 text-xs font-semibold rounded-full flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Signed
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[10px] text-text-faint font-medium">Must-haves:</span>
              {project.requirements?.mustHaves?.map((mh, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-surface-card border border-surface-border text-text-muted text-[10px] rounded-full font-medium">
                  {mh}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {/* Reviewer Avatar Stack */}
          <AvatarStack approvalData={approvalData} vendors={project.vendors} />

          {/* Export */}
          <div className="relative group">
            <button className="bg-surface-card border border-surface-border hover:border-surface-borderHover text-text-muted font-medium text-xs h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 shadow-card transition-all">
              <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-52 bg-surface-elevated border border-surface-border rounded-xl shadow-card hidden group-hover:block z-40 p-1">
              {[
                { format: 'markdown', icon: FileText, label: 'Executive Summary (.md)', color: 'text-accent-blue' },
                { format: 'xlsx', icon: FileSpreadsheet, label: 'Excel Workbook (.xlsx)', color: 'text-success' },
                { format: 'ariba', icon: ExternalLink, label: 'Ariba / Coupa JSON', color: 'text-warning' },
              ].map(({ format, icon: Icon, label, color }) => (
                <a key={format} href={getExportUrl(projectId, format)} download
                  className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-cardHover rounded-lg transition-all">
                  <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
                </a>
              ))}
            </div>
          </div>

          {/* Approve */}
          {!approvalData ? (
            <form onSubmit={handleApprove} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Approver name"
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
                className="bg-surface-card border border-surface-border rounded-lg px-3 text-xs text-text-primary h-9 w-32 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all placeholder:text-text-faint"
                required
              />
              <button type="submit" disabled={isApproving}
                className="bg-gradient-to-r from-success to-emerald-400 text-white font-semibold text-xs h-9 px-3.5 rounded-lg shadow-glow-green inline-flex items-center gap-1.5 transition-all hover:shadow-glow-green/50 disabled:opacity-50">
                <ShieldCheck className="w-4 h-4" /> Approve & Sign
              </button>
            </form>
          ) : (
            <div className="bg-success/10 border border-success/20 h-9 px-3.5 rounded-lg text-success text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Approved — {approvalData.approvedBy}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. KPI Stat Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Total Contract Value"
          value={totalCost > 0 ? `$${(totalCost / 1000).toFixed(0)}k` : '—'}
          iconBg="bg-accent-blue/10" iconColor="text-accent-blue" />
        <KpiCard icon={BarChart2} label="Avg. Compliance Score"
          value={`${avgScore}%`} valueClass="text-gradient"
          iconBg="bg-accent-violet/10" iconColor="text-accent-violet" />
        <KpiCard icon={Users} label="Vendors Under Review"
          value={evaluatedVendors.length}
          iconBg="bg-success/10" iconColor="text-success" />
        <KpiCard icon={AlertTriangle} label="High-Severity Risks"
          value={highRisks}
          valueClass={highRisks > 0 ? 'text-danger' : 'text-success'}
          iconBg={highRisks > 0 ? 'bg-danger/10' : 'bg-success/10'}
          iconColor={highRisks > 0 ? 'text-danger' : 'text-success'}
          badge={highRisks > 0 ? 'FLAGGED' : 'CLEAR'}
          badgeColor={highRisks > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'} />
      </div>

      {/* ── 3. SIGNATURE HERO — Decision Confidence Band ── */}
      <div className="bg-surface-elevated border border-surface-border rounded-[20px] p-6 shadow-card relative overflow-hidden"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 60px rgba(59,130,246,0.08)' }}>
        {/* Radial glow backdrop */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          {/* Gauge + Recommendation */}
          <div className="flex items-center gap-6">
            {/* Animated SVG radial gauge */}
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="40" stroke="#1E2636" strokeWidth="10" fill="transparent" />
                <circle cx="50" cy="50" r="40" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={gaugeCirc}
                  strokeDashoffset={gaugeOffset}
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-2xl font-bold text-gradient leading-none">{gaugeScore}%</span>
                <span className="text-[9px] font-medium text-text-faint uppercase tracking-wider mt-0.5">Score</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success border border-success/20 text-xs font-semibold rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Recommended Sourcing Choice
              </div>
              <h2 className="font-display text-3xl font-bold text-text-primary">{topVendor?.vendor_name || '—'}</h2>
              <p className="text-text-muted text-xs font-medium flex items-center gap-3">
                <span>Total: <span className="font-mono font-bold text-text-primary">${topVendor?.extraction?.pricing?.totalCost?.toLocaleString() || 'N/A'}</span></span>
                <span className="text-text-faint">•</span>
                <span>SLA: <span className="font-semibold text-text-primary">{topVendor?.extraction?.sla?.uptimeGuarantee || 'N/A'}</span></span>
              </p>
            </div>
          </div>

          {/* Comparison dot axis strip */}
          <div className="w-full lg:w-1/2 bg-surface-card border border-surface-border rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-display font-semibold text-text-primary">Score Distribution Strip</span>
              <span className="font-mono text-[10px] text-text-faint">0 — 100</span>
            </div>
            <div className="relative pt-7 pb-3 px-2">
              <div className="h-1.5 bg-surface-divider rounded-full w-full relative">
                {evaluatedVendors.map((v) => {
                  const leftPos = Math.max(4, Math.min(96, v.dynamicScore));
                  const isTop = v.dynamicRank === 1;
                  return (
                    <div key={v.id} style={{ left: `${leftPos}%` }} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 border-surface-bg transition-transform hover:scale-125 ${isTop ? 'shadow-glow-blue' : ''}`}
                        style={{ background: isTop ? 'linear-gradient(135deg,#3B82F6,#8B5CF6)' : '#4B5468' }} />
                      <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-card ${isTop ? 'bg-gradient-brand text-white' : 'bg-surface-elevated border border-surface-border text-text-muted'}`}>
                        {v.vendor_name.split(' ')[0]}: {v.dynamicScore}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Executive Summary (AI Signal) ── */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-accent-violet" /> Procurement Executive Summary
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-aiSignal/10 border border-accent-aiSignal/20 text-accent-aiSignal text-[10px] font-semibold rounded-full">
            <Sparkles className="w-3 h-3" /> AI Executive Synthesis
          </span>
        </div>
        <div className="bg-accent-aiSignal/5 border border-accent-aiSignal/15 rounded-xl p-4 text-text-muted text-xs leading-relaxed whitespace-pre-line">
          {project.summary?.text || 'Analysis completed across all uploaded proposal documents.'}
        </div>
        {project.summary?.topRisks?.length > 0 && (
          <div className="bg-danger/5 border border-danger/15 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-semibold text-danger uppercase tracking-wider block">Key Contractual Risks:</span>
            {project.summary.topRisks.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-danger/80">
                <AlertTriangle className="w-3 h-3 text-danger shrink-0" /> <span>{r}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Vendor Ranking Cards with Sub-Score Sparklines ── */}
      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
          <Award className="w-4 h-4 text-warning" /> Vendor Compliance Rankings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {evaluatedVendors.map((vendor) => {
            const ext = vendor.extraction || {};
            const cost = ext.pricing?.totalCost;
            const benchmark = vendor.price_benchmark || 'typical';
            const benchClass = benchmark === 'low' ? 'bg-success/10 text-success border-success/20' :
              benchmark === 'high' ? 'bg-danger/10 text-danger border-danger/20' :
              'bg-surface-border text-text-muted border-surface-borderHover';
            const isRank1 = vendor.dynamicRank === 1;
            const subs = getSubScores(vendor);

            return (
              <div key={vendor.id} className={`bg-surface-card border rounded-2xl p-5 shadow-card transition-all duration-150 ${isRank1 ? 'border-accent-blue/30 shadow-glow-blue/10' : 'border-surface-border hover:border-surface-borderHover'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full font-mono text-xs font-bold flex items-center justify-center text-white ${isRank1 ? 'bg-gradient-brand shadow-glow-blue' : 'bg-surface-elevated border border-surface-border'}`}
                      style={!isRank1 ? { color: '#8891A7' } : {}}>
                      {vendor.dynamicRank}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-text-primary text-sm">{vendor.vendor_name}</h3>
                      <p className="text-text-faint text-[10px] truncate max-w-[140px]">{vendor.file_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-bold text-gradient">{vendor.dynamicScore}%</span>
                    <span className="block text-[10px] text-text-faint">Compliance</span>
                  </div>
                </div>

                <div className="text-xs border-t border-surface-divider pt-3 mb-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-text-faint">Total Cost:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-primary">{cost ? `$${cost.toLocaleString()}` : '—'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${benchClass}`}>{benchmark}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-faint">SLA Uptime:</span>
                    <span className="font-semibold text-text-primary">{ext.sla?.uptimeGuarantee || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-faint">Support:</span>
                    <span className="font-semibold text-text-primary">{ext.sla?.supportHours || '—'}</span>
                  </div>
                </div>

                {/* Sub-score sparklines */}
                <div className="border-t border-surface-divider pt-3 space-y-1.5">
                  <span className="text-[10px] text-text-faint font-semibold uppercase tracking-wider">Score Breakdown</span>
                  <SubScoreBar label="Price" value={subs.price} color="bg-accent-blue" />
                  <SubScoreBar label="SLA" value={subs.sla} color="bg-success" />
                  <SubScoreBar label="Features" value={subs.features} color="bg-accent-violet" />
                  <SubScoreBar label="Support" value={subs.support} color="bg-warning" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. What-If Simulator (AI signal tint, pulsing "Live" dot) ── */}
      <div className="bg-accent-aiSignal/5 border border-accent-aiSignal/15 rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-aiSignal" />
              Live "What-If" Re-Weighting Scenario Simulator
            </h2>
            <p className="text-text-faint text-xs mt-0.5">Drag weight sliders to dynamically recalculate rankings in real time.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1 rounded-full bg-surface-card border border-surface-border text-accent-aiSignal">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-aiSignal pulse-glow" /> Live Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(simulatorWeights).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-xs font-medium text-text-muted mb-2">
                <span>{WEIGHT_LABELS[key]}</span>
                <span className="font-mono font-bold text-gradient">{val}%</span>
              </div>
              <div className="relative h-2 rounded-full bg-surface-divider cursor-pointer">
                <div className="absolute left-0 top-0 h-2 rounded-full bg-gradient-brand transition-all" style={{ width: `${val}%` }} />
                <input type="range" min="0" max="100" value={val} onChange={e => handleWeightChange(key, e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. Comparison Matrix ── */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
        <h2 className="font-display text-sm font-semibold text-text-primary">Side-by-Side Proposal Comparison Matrix</h2>
        <div className="relative overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-surface-elevated border-b border-surface-border font-display">
                <th className="p-3.5 font-semibold text-text-muted w-44 sticky left-0 bg-surface-elevated border-r border-surface-border z-10">Attribute</th>
                {evaluatedVendors.map(v => (
                  <th key={v.id} className="p-3.5 font-semibold text-text-primary border-r border-surface-border min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full text-white font-mono text-[9px] font-bold flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>{v.dynamicRank}</span>
                      {v.vendor_name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-divider">
              {[
                {
                  label: 'Total Quoted Cost',
                  render: (v) => {
                    const cost = v.extraction?.pricing?.totalCost;
                    const minCost = Math.min(...evaluatedVendors.map(x => x.extraction?.pricing?.totalCost || Infinity));
                    const isBest = cost && cost === minCost;
                    return <td key={v.id} className={`p-3.5 border-r border-surface-divider font-mono ${isBest ? 'text-success font-bold bg-success/5' : 'text-text-muted'}`}>
                      {cost ? `$${cost.toLocaleString()}` : <span className="text-text-faint italic">Not specified</span>}
                      {isBest && <Check className="w-3.5 h-3.5 inline ml-1 text-success" />}
                    </td>;
                  }
                },
                { label: 'Uptime SLA', render: (v) => <td key={v.id} className="p-3.5 border-r border-surface-divider text-text-muted">{v.extraction?.sla?.uptimeGuarantee || <span className="text-text-faint italic">Not specified</span>}</td> },
                { label: 'Support Hours', render: (v) => <td key={v.id} className="p-3.5 border-r border-surface-divider text-text-muted">{v.extraction?.sla?.supportHours || <span className="text-text-faint italic">Not specified</span>}</td> },
                { label: 'Payment Terms', render: (v) => <td key={v.id} className="p-3.5 border-r border-surface-divider text-text-muted">{v.extraction?.pricing?.paymentTerms || <span className="text-text-faint italic">Not specified</span>}</td> },
                {
                  label: 'Key Features', render: (v) => {
                    const feats = v.extraction?.features || [];
                    return <td key={v.id} className="p-3.5 border-r border-surface-divider">
                      {feats.length > 0
                        ? <ul className="space-y-1">{feats.slice(0, 3).map((f, i) => <li key={i} className="text-[11px] text-text-muted flex items-center gap-1"><Check className="w-3 h-3 text-success shrink-0" />{f}</li>)}</ul>
                        : <span className="text-text-faint italic">Not specified</span>}
                    </td>;
                  }
                },
              ].map(({ label, render }) => (
                <tr key={label} className="even:bg-surface-elevated/30">
                  <td className="p-3.5 font-medium text-text-muted sticky left-0 bg-surface-card border-r border-surface-border z-10">{label}</td>
                  {evaluatedVendors.map(v => render(v))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 8. Cost Distribution Donut + Bar Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent-blue" /> Cost Distribution Breakdown
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <PieChart width={128} height={128}>
                <Pie data={donutData} cx={60} cy={60} innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={3}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-xs font-bold text-gradient">${(totalCost / 1000).toFixed(0)}k</span>
                <span className="text-[9px] text-text-faint">Total</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
                    <span className="text-text-muted">{d.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-text-primary">${d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-accent-violet" /> Total Cost Comparison
          </h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evaluatedVendors.map(v => ({ name: v.vendor_name.split(' ')[0], cost: v.extraction?.pricing?.totalCost || 0, rank: v.dynamicRank }))}>
                <XAxis dataKey="name" stroke="#4B5468" fontSize={11} fontFamily="Inter" />
                <YAxis stroke="#4B5468" fontSize={11} fontFamily="JetBrains Mono" tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Total Cost']} contentStyle={{ background: '#141B2C', border: '1px solid #1E2636', borderRadius: 12, color: '#F1F5F9', fontSize: 11 }} />
                <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                  {evaluatedVendors.map((e, i) => <Cell key={i} fill={e.dynamicRank === 1 ? '#3B82F6' : '#4B5468'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 9. Risk & Red Flags Panel ── */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
        <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger" /> Contract Risk & Redline Audit
        </h2>
        <div className="space-y-3">
          {evaluatedVendors.map(vendor => {
            const isOpen = openRisksVendor === vendor.id;
            const risks = vendor.risks || [];
            return (
              <div key={vendor.id} className="border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenRisksVendor(isOpen ? null : vendor.id)}
                  className="w-full bg-surface-elevated hover:bg-surface-cardHover p-4 flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-text-primary text-sm">{vendor.vendor_name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${risks.some(r => r.severity === 'High') ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-surface-border text-text-faint'}`}>
                      {risks.length} Risks
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-text-faint" /> : <ChevronDown className="w-4 h-4 text-text-faint" />}
                </button>
                {isOpen && (
                  <div className="p-4 bg-surface-bg space-y-3">
                    {risks.length === 0
                      ? <p className="text-xs text-text-faint italic">No significant risks flagged for this proposal.</p>
                      : risks.map(r => {
                        const borderColor = r.severity === 'High' ? '#F43F5E' : r.severity === 'Medium' ? '#F59E0B' : '#4B5468';
                        const badgeBg = r.severity === 'High' ? 'bg-danger text-white' : r.severity === 'Medium' ? 'bg-warning text-white' : 'bg-surface-border text-text-muted';
                        return (
                          <div key={r.id} className="p-4 rounded-r-xl bg-surface-card border border-surface-border space-y-2" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${badgeBg}`}>{r.severity}</span>
                              <span className="font-semibold text-text-primary capitalize">{r.category?.replace('_', ' ')}</span>
                            </div>
                            <p className="text-xs text-text-muted">{r.description}</p>
                            {r.redline_suggestion && (
                              <div className="mt-2 p-3 bg-accent-aiSignal/8 border border-accent-aiSignal/20 rounded-lg space-y-1">
                                <div className="flex items-center gap-1.5 text-accent-aiSignal font-semibold text-[10px]">
                                  <Sparkles className="w-3 h-3" /> AI Suggested Redline Fix:
                                </div>
                                <p className="font-mono text-[10px] text-text-muted leading-relaxed">"{r.redline_suggestion}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 10. Negotiation Panel + Impact Chart ── */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent-violet" /> AI Negotiation Strategy & Draft Emails
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-aiSignal/10 border border-accent-aiSignal/20 text-accent-aiSignal text-[10px] font-semibold rounded-full">
            <Sparkles className="w-3 h-3" /> AI Drafted
          </span>
        </div>

        {/* Negotiation impact area chart */}
        {negImpactData.length > 0 && (
          <div>
            <p className="text-[11px] text-text-faint mb-2 font-medium">Estimated Cost Reduction from AI Negotiation Strategy:</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={negImpactData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2636" />
                  <XAxis dataKey="vendor" stroke="#4B5468" fontSize={11} fontFamily="Inter" />
                  <YAxis stroke="#4B5468" fontSize={11} fontFamily="JetBrains Mono" tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: '#141B2C', border: '1px solid #1E2636', borderRadius: 12, color: '#F1F5F9', fontSize: 11 }} />
                  <Legend />
                  <Bar dataKey="current" name="Current Price" fill="#4B5468" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="postNeg" name="Post-Negotiation Est." fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {project.negotiation_tips?.map((item, idx) => (
            <div key={idx} className="bg-accent-aiSignal/5 border border-accent-aiSignal/15 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-display font-semibold text-text-primary text-sm mb-2">{item.vendorName}</h3>
                <ul className="space-y-1.5">
                  {item.suggestions?.map((s, i) => (
                    <li key={i} className="text-[11px] text-text-muted flex items-start gap-2">
                      <span className="text-accent-aiSignal font-bold shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setActiveEmailModal(item)}
                className="w-full border border-accent-violet/30 hover:border-accent-violet text-accent-violet font-semibold text-xs py-2 px-3 rounded-lg transition-all inline-flex items-center justify-center gap-1.5 bg-accent-violet/5 hover:bg-accent-violet/10"
              >
                <MessageSquare className="w-3.5 h-3.5" /> View Draft Email
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 11. Notes & Activity Log (two-column) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-accent-blue" /> Per-Vendor Internal Notes
          </h2>
          <div className="space-y-4">
            {evaluatedVendors.map(v => (
              <div key={v.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-text-muted">{v.vendor_name}</span>
                  <button onClick={() => handleNoteSave(v.id)} className="text-accent-blue hover:text-accent-violet text-[11px] font-medium transition-colors">
                    {savingNotes[v.id] ? 'Saving…' : 'Save Note'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={vendorNotes[v.id] || ''}
                  onChange={e => setVendorNotes({ ...vendorNotes, [v.id]: e.target.value })}
                  placeholder={`Notes for ${v.vendor_name}…`}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all resize-none placeholder:text-text-faint"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" /> Project Activity Audit Log
          </h2>
          <div className="max-h-64 overflow-y-auto space-y-4 pr-1 relative border-l border-surface-divider ml-2 pl-4">
            {project.activity_log?.map((log, idx) => (
              <div key={idx} className="relative text-xs space-y-0.5">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-surface-bg"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }} />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">{log.action}</span>
                  <span className="font-mono text-[10px] text-text-faint">{log.timestamp}</span>
                </div>
                <p className="text-text-faint text-[11px]">{log.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 12. Chat Trigger Button ── */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-brand text-white font-semibold text-xs px-4 py-3 rounded-full shadow-glow-blue hover:shadow-glow-violet transition-all hover:scale-105 flex items-center gap-2.5"
          >
            <Bot className="w-5 h-5 text-blue-200" />
            Ask Your Proposals (Groq RAG)
          </button>
        )}
      </div>

      {/* ── 13. Chat Slide-Over Drawer (fixes overlap bug) ── */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-surface-bg/60 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface-card border-l border-surface-border shadow-card flex flex-col">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white/70" />
                <span className="font-display font-semibold text-white text-sm">Proposal AI Assistant</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-bg/50 text-xs">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-brand text-white rounded-br-none shadow-glow-blue/20'
                      : 'bg-accent-aiSignal/10 border border-accent-aiSignal/20 text-text-muted rounded-bl-none'
                  }`}>
                    {msg.text}
                    {msg.vendors?.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-accent-aiSignal/20 text-[10px] text-accent-aiSignal font-semibold">
                        Cited: {msg.vendors.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatThinking && (
                <div className="flex items-center gap-1.5 text-[11px] text-text-faint italic p-2">
                  <Bot className="w-3.5 h-3.5 animate-spin text-accent-blue" /> Searching proposal chunks…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            <form onSubmit={handleChatSubmit} className="p-3 bg-surface-elevated border-t border-surface-border flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask e.g. Which vendor has 24/7 support?"
                className="flex-1 bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue placeholder:text-text-faint"
              />
              <button type="submit" className="bg-gradient-brand text-white p-2.5 rounded-lg shadow-glow-blue hover:shadow-glow-violet transition-all">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 14. Draft Email Modal ── */}
      {activeEmailModal && (
        <div className="fixed inset-0 bg-surface-bg/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-surface-border rounded-2xl p-6 max-w-xl w-full shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-surface-divider pb-3">
              <h3 className="font-display font-semibold text-text-primary">Draft Email: {activeEmailModal.vendorName}</h3>
              <button onClick={() => setActiveEmailModal(null)} className="text-text-faint hover:text-text-primary font-bold">✕</button>
            </div>
            <div className="bg-accent-aiSignal/8 border border-accent-aiSignal/20 rounded-xl p-4 font-mono text-xs text-text-muted leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {activeEmailModal.negotiationEmail}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setActiveEmailModal(null)} className="px-4 py-2 text-xs text-text-muted hover:text-text-primary bg-surface-card border border-surface-border rounded-lg transition-colors">Close</button>
              <button onClick={() => copyToClipboard(activeEmailModal.negotiationEmail)}
                className="bg-gradient-brand text-white font-semibold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-glow-blue transition-all">
                {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEmail ? 'Copied!' : 'Copy Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
