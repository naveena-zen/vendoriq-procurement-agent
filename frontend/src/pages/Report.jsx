import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProjectDetails, getExportUrl, approveProjectApi, saveVendorNoteApi, sendChatQuestion } from '../api/client';
import { calculateVendorScore } from '../lib/scoring';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowLeft, Download, ShieldCheck, CheckCircle2, Sliders, AlertTriangle, FileText, FileSpreadsheet,
  Copy, Check, MessageSquare, Send, ChevronDown, ChevronUp, Bot, Sparkles, Clock, Edit3, DollarSign, Award, ExternalLink, X
} from 'lucide-react';

export default function Report() {
  const { id: projectId } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // What-If Simulator Weights State
  const [simulatorWeights, setSimulatorWeights] = useState({
    price: 40,
    sla: 25,
    features: 20,
    support: 15,
  });

  // Modal State
  const [activeEmailModal, setActiveEmailModal] = useState(null); // { vendorName, email }
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Approval State
  const [approverName, setApproverName] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approvalData, setApprovalData] = useState(null);

  // Vendor Notes State
  const [vendorNotes, setVendorNotes] = useState({});
  const [savingNotes, setSavingNotes] = useState({});

  // Chat Drawer State (Slide-over with backdrop, off by default or toggled)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am ProcureIQ Proposal Assistant. Ask me any question across your uploaded proposals and I will cite the specific vendor sources.',
      vendors: []
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);

  // UI Accordion Toggles for Risks
  const [openRisksVendor, setOpenRisksVendor] = useState(null);

  useEffect(() => {
    loadReport();
  }, [projectId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchProjectDetails(projectId);
      setProject(data);
      setApprovalData(data.approval);
      if (data.requirements?.weights) {
        setSimulatorWeights(data.requirements.weights);
      }
      const notesMap = {};
      data.vendors?.forEach(v => {
        notesMap[v.id] = v.notes || '';
      });
      setVendorNotes(notesMap);
      if (data.vendors?.length > 0) {
        setOpenRisksVendor(data.vendors[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  // Re-compute vendor ranking dynamically based on What-If Simulator Weights
  const evaluatedVendors = useMemo(() => {
    if (!project || !project.vendors) return [];

    const mustHaves = project.requirements?.mustHaves || [];

    const reScored = project.vendors.map((v) => {
      const liveScore = calculateVendorScore(v, project.vendors, simulatorWeights, mustHaves);
      return {
        ...v,
        dynamicScore: liveScore,
      };
    });

    reScored.sort((a, b) => b.dynamicScore - a.dynamicScore);

    return reScored.map((v, index) => ({
      ...v,
      dynamicRank: index + 1,
    }));
  }, [project, simulatorWeights]);

  const handleWeightChange = (key, value) => {
    const val = Math.max(0, Math.min(100, Number(value)));
    const oldVal = simulatorWeights[key];
    const diff = val - oldVal;

    const otherKeys = Object.keys(simulatorWeights).filter(k => k !== key);
    const otherSum = otherKeys.reduce((acc, k) => acc + simulatorWeights[k], 0);

    let newWeights = { ...simulatorWeights, [key]: val };

    if (otherSum > 0 && diff !== 0) {
      otherKeys.forEach(k => {
        const ratio = simulatorWeights[k] / otherSum;
        const adjusted = Math.max(0, Math.round((simulatorWeights[k] - diff * ratio) * 10) / 10);
        newWeights[k] = adjusted;
      });
    }

    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      newWeights[otherKeys[0]] = Math.round((newWeights[otherKeys[0]] + (100 - total)) * 10) / 10;
    }

    setSimulatorWeights(newWeights);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approverName.trim()) return;
    try {
      setIsApproving(true);
      const res = await approveProjectApi(projectId, approverName);
      setApprovalData(res);
      loadReport();
    } catch (err) {
      alert('Approval failed: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleNoteSave = async (vendorId) => {
    try {
      setSavingNotes({ ...savingNotes, [vendorId]: true });
      await saveVendorNoteApi(vendorId, vendorNotes[vendorId]);
    } catch (err) {
      alert('Failed to save note');
    } finally {
      setSavingNotes({ ...savingNotes, [vendorId]: false });
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatThinking) return;

    const userQ = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setIsChatThinking(true);

    try {
      const res = await sendChatQuestion(projectId, userQ);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.answer,
          vendors: res.cited_vendors || []
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an error searching proposal documents.',
          vendors: []
        }
      ]);
    } finally {
      setIsChatThinking(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Bot className="w-10 h-10 text-brand-indigo animate-spin mx-auto" />
          <h3 className="font-display text-base font-semibold text-slate-900">Loading Intelligence Report...</h3>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-level-2 space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-display text-lg font-semibold text-slate-900">Report Unavailable</h3>
          <p className="text-xs text-slate-500">{error || 'Project not found'}</p>
          <Link to="/" className="inline-block bg-brand-indigo hover:bg-brand-indigoHover text-white font-medium text-xs px-4 py-2 rounded-lg transition-all shadow-sm">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const topVendor = evaluatedVendors[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* 1. Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-level-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link to="/" className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-semibold text-slate-900 text-lg truncate">{project.name}</h1>
                {approvalData && approvalData.status === 'APPROVED & SIGNED' && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-full flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pt-0.5">
                <span className="font-medium text-slate-400">Must-haves:</span>
                {project.requirements?.mustHaves?.map((mh, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-medium border border-slate-200 whitespace-nowrap">
                    {mh}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Header Action Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Export Dropdown */}
            <div className="relative group">
              <button className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-xs h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 shadow-level-1 transition-all">
                <Download className="w-3.5 h-3.5 text-brand-indigo" /> Export <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-level-2 hidden group-hover:block z-40 p-1">
                <a
                  href={getExportUrl(projectId, 'markdown')}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> Executive Summary (.md)
                </a>
                <a
                  href={getExportUrl(projectId, 'xlsx')}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel Workbook (.xlsx)
                </a>
                <a
                  href={getExportUrl(projectId, 'ariba')}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" /> Ariba / Coupa JSON Import
                </a>
              </div>
            </div>

            {/* Approve & Sign Cluster */}
            {!approvalData ? (
              <form onSubmit={handleApprove} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Approver Name"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 text-xs text-slate-900 h-9 w-32 focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-3.5 rounded-lg shadow-sm inline-flex items-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Approve & Sign
                </button>
              </form>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 h-9 px-3.5 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved by {approvalData.approvedBy} ({approvalData.approvedAt})
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. SIGNATURE ELEMENT — Decision Confidence Hero Band */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-3 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* Left side: Radial Compliance Gauge & Top Recommendation */}
            <div className="flex items-center gap-6">
              {/* Animated Radial SVG Gauge */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track circle */}
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#E2E8F0" strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#4338CA" strokeWidth="10" strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (topVendor?.dynamicScore || 0) / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Center score display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[28px] font-bold text-slate-900 leading-none">
                    {topVendor?.dynamicScore || 0}%
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Score</span>
                </div>
              </div>

              {/* Recommendation Meta */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Recommended Sourcing Choice
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                  {topVendor?.vendor_name || 'Top Vendor'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Quoted Total: <span className="font-mono font-semibold text-slate-900">${topVendor?.extraction?.pricing?.totalCost?.toLocaleString() || 'N/A'}</span>
                  <span className="mx-2">•</span>
                  Uptime SLA: <span className="font-semibold text-slate-800">{topVendor?.extraction?.sla?.uptimeGuarantee || 'N/A'}</span>
                </p>
              </div>
            </div>

            {/* Right side: Compact Horizontal Comparison Axis Strip */}
            <div className="w-full lg:w-1/2 bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-display font-semibold text-slate-900">Compliance Score Distribution Strip</span>
                <span className="font-mono text-[11px] text-slate-500">0% — 100% Score Axis</span>
              </div>

              {/* Axis Line with plotted dots */}
              <div className="relative pt-6 pb-4 px-2">
                <div className="h-2 bg-slate-200 rounded-full w-full relative">
                  {evaluatedVendors.map((v) => {
                    const isTop = v.dynamicRank === 1;
                    const leftPos = Math.max(5, Math.min(95, v.dynamicScore));

                    return (
                      <div
                        key={v.id}
                        style={{ left: `${leftPos}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                      >
                        {/* Dot */}
                        <div className={`w-4 h-4 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                          isTop
                            ? 'bg-brand-indigo border-white ring-4 ring-brand-indigo/20 shadow-md'
                            : 'bg-slate-400 border-white'
                        }`} />

                        {/* Floating Label */}
                        <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-mono font-semibold px-2 py-0.5 rounded shadow-sm transition-all ${
                          isTop ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                        }`}>
                          {v.vendor_name}: {v.dynamicScore}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-right">Interactive summary plotted from scoring engine matrix</p>
            </div>

          </div>
        </div>

        {/* 3. Executive Summary Card (AI Signal Violet Wash) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-indigo" />
              <h2 className="font-display text-base font-semibold text-slate-900">Procurement Executive Summary</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-ai-light border border-violet-200 text-ai-accent text-xs font-medium rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-ai-accent" /> AI Executive Synthesis
            </div>
          </div>

          <div className="bg-[#F5F3FF]/60 border border-violet-100 rounded-xl p-4 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
            {project.summary?.text || 'Analysis completed across all uploaded proposal documents.'}
          </div>

          {project.summary?.topRisks?.length > 0 && (
            <div className="bg-rose-50/60 border border-rose-200/70 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                Key Contractual Risks Identified:
              </span>
              <ul className="space-y-1.5">
                {project.summary.topRisks.map((rText, idx) => (
                  <li key={idx} className="text-xs text-rose-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{rText}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <a
              href={getExportUrl(projectId, 'markdown')}
              download
              className="text-xs font-medium text-brand-indigo hover:text-brand-indigoHover bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-level-1 hover:shadow transition-all inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Executive Summary
            </a>
          </div>
        </div>

        {/* 4. Vendor Ranking Cards */}
        <div className="space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Vendor Evaluation Compliance Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {evaluatedVendors.map((vendor) => {
              const ext = vendor.extraction || {};
              const cost = ext.pricing?.totalCost;
              const costStr = cost ? `$${cost.toLocaleString()}` : 'Not specified';
              const benchmark = vendor.price_benchmark || 'typical';

              const benchBadge =
                benchmark === 'low'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : benchmark === 'high'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200';

              const isRank1 = vendor.dynamicRank === 1;

              return (
                <div
                  key={vendor.id}
                  className={`bg-white border rounded-xl p-6 shadow-level-1 transition-all ${
                    isRank1 ? 'border-brand-indigo ring-2 ring-brand-indigo/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Solid Rank Indicator Circle */}
                      <div className={`w-8 h-8 rounded-full font-mono text-xs font-bold flex items-center justify-center ${
                        isRank1 ? 'bg-brand-indigo text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {vendor.dynamicRank}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-slate-900 text-base">{vendor.vendor_name}</h3>
                        <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{vendor.file_name}</p>
                      </div>
                    </div>
                    {/* JetBrains Mono Hero Score */}
                    <div className="text-right">
                      <span className="font-mono text-2xl font-bold text-brand-indigo">
                        {vendor.dynamicScore}%
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">Compliance</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Quoted Total Cost:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{costStr}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${benchBadge}`}>
                          {benchmark}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Uptime SLA:</span>
                      <span className="font-semibold text-slate-800">{ext.sla?.uptimeGuarantee || 'Not specified'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Support SLA:</span>
                      <span className="font-semibold text-slate-800">{ext.sla?.supportHours || 'Not specified'}</span>
                    </div>
                  </div>

                  {/* Top Features */}
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Key Capabilities</span>
                    <div className="flex flex-wrap gap-1">
                      {(ext.features || []).slice(0, 3).map((feat, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-medium">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Live Client-Side "What-If" Scenario Simulator (AI Signal Wash) */}
        <div className="bg-[#F5F3FF]/50 border border-violet-200 rounded-2xl p-6 shadow-level-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-ai-accent" />
                Live "What-If" Re-Weighting Scenario Simulator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag weight sliders to dynamically recalculate vendor compliance scores and rank order in real time.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-white border border-violet-200 text-ai-accent">
              Reactive Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Price Weight</span>
                <span className="font-mono font-semibold text-brand-indigo">{simulatorWeights.price}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.price}
                onChange={(e) => handleWeightChange('price', e.target.value)}
                className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>SLA Weight</span>
                <span className="font-mono font-semibold text-brand-indigo">{simulatorWeights.sla}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.sla}
                onChange={(e) => handleWeightChange('sla', e.target.value)}
                className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Features Weight</span>
                <span className="font-mono font-semibold text-brand-indigo">{simulatorWeights.features}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.features}
                onChange={(e) => handleWeightChange('features', e.target.value)}
                className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Support Weight</span>
                <span className="font-mono font-semibold text-brand-indigo">{simulatorWeights.support}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.support}
                onChange={(e) => handleWeightChange('support', e.target.value)}
                className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* 6. Side-by-Side Vendor Comparison Matrix */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-1 overflow-hidden space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Side-by-Side Proposal Comparison Matrix
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-display">
                  <th className="p-3.5 font-semibold text-slate-700 w-48 sticky left-0 bg-slate-50 border-r border-slate-200">
                    Attribute / Specification
                  </th>
                  {evaluatedVendors.map((v) => (
                    <th key={v.id} className="p-3.5 font-semibold text-slate-900 border-r border-slate-200 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-indigo text-white font-mono text-[10px] font-bold flex items-center justify-center">
                          {v.dynamicRank}
                        </span>
                        <span>{v.vendor_name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Total Cost Row */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Total Quoted Cost</td>
                  {evaluatedVendors.map((v) => {
                    const cost = v.extraction?.pricing?.totalCost;
                    const minCost = Math.min(...evaluatedVendors.map(x => x.extraction?.pricing?.totalCost || Infinity));
                    const isBest = cost && cost === minCost;
                    return (
                      <td key={v.id} className={`p-3.5 border-r border-slate-100 ${isBest ? 'bg-emerald-50/70 text-emerald-800 font-semibold' : 'text-slate-800'}`}>
                        {cost ? <span className="font-mono">${cost.toLocaleString()}</span> : <span className="text-slate-400 italic">Not specified</span>}
                        {isBest && <Check className="w-3.5 h-3.5 inline ml-1 text-emerald-600" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Uptime SLA */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Uptime SLA Guarantee</td>
                  {evaluatedVendors.map((v) => {
                    const sla = v.extraction?.sla?.uptimeGuarantee;
                    const isBest = sla && (sla.includes('99.99%') || sla.includes('99.99'));
                    return (
                      <td key={v.id} className={`p-3.5 border-r border-slate-100 ${isBest ? 'bg-emerald-50/70 text-emerald-800 font-semibold' : 'text-slate-800'}`}>
                        {sla || <span className="text-slate-400 italic">Not specified</span>}
                        {isBest && <Check className="w-3.5 h-3.5 inline ml-1 text-emerald-600" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Support Hours */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Support Hours SLA</td>
                  {evaluatedVendors.map((v) => {
                    const supp = v.extraction?.sla?.supportHours;
                    const isBest = supp && (supp.includes('24/7') || supp.includes('24x7'));
                    return (
                      <td key={v.id} className={`p-3.5 border-r border-slate-100 ${isBest ? 'bg-emerald-50/70 text-emerald-800 font-semibold' : 'text-slate-800'}`}>
                        {supp || <span className="text-slate-400 italic">Not specified</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* Payment Terms */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Payment Terms</td>
                  {evaluatedVendors.map((v) => (
                    <td key={v.id} className="p-3.5 border-r border-slate-100 text-slate-800">
                      {v.extraction?.pricing?.paymentTerms || <span className="text-slate-400 italic">Not specified</span>}
                    </td>
                  ))}
                </tr>

                {/* Contract Duration */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Contract Duration & Terms</td>
                  {evaluatedVendors.map((v) => (
                    <td key={v.id} className="p-3.5 border-r border-slate-100 text-slate-800">
                      {v.extraction?.contractTerms?.duration} - {v.extraction?.contractTerms?.renewalTerms || <span className="text-slate-400 italic">Not specified</span>}
                    </td>
                  ))}
                </tr>

                {/* Included Features */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Features Included</td>
                  {evaluatedVendors.map((v) => {
                    const feats = v.extraction?.features || [];
                    return (
                      <td key={v.id} className="p-3.5 border-r border-slate-100 text-slate-800">
                        {feats.length > 0 ? (
                          <ul className="space-y-1">
                            {feats.map((f, idx) => (
                              <li key={idx} className="flex items-center gap-1 text-[11px]">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Missing Info Notes */}
                <tr className="even:bg-slate-50/50">
                  <td className="p-3.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">Missing Information Notes</td>
                  {evaluatedVendors.map((v) => {
                    const missing = v.extraction?.notesOnMissingInfo || [];
                    return (
                      <td key={v.id} className="p-3.5 border-r border-slate-100 text-slate-600 italic">
                        {missing.length > 0 ? missing.join('; ') : <span className="text-slate-400">None</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Cost Breakdown Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-1 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-indigo" />
            Vendor Total Quoted Cost Comparison
          </h2>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evaluatedVendors.map(v => ({
                name: v.vendor_name,
                cost: v.extraction?.pricing?.totalCost || 0,
                rank: v.dynamicRank
              }))}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} fontFamily="Inter" />
                <YAxis stroke="#64748b" fontSize={12} fontFamily="JetBrains Mono" tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Total Cost']} />
                <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                  {evaluatedVendors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.dynamicRank === 1 ? '#4338CA' : '#818CF8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 8. Risk & Red Flags Panel (Left-Border-Accented Cards + AI Redline Blocks) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-1 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Contract Risk & Redline Suggestions Audit
          </h2>

          <div className="space-y-4">
            {evaluatedVendors.map((vendor) => {
              const isOpen = openRisksVendor === vendor.id;
              const risks = vendor.risks || [];

              return (
                <div key={vendor.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setOpenRisksVendor(isOpen ? null : vendor.id)}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 p-4 flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold text-slate-900 text-sm">{vendor.vendor_name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        risks.some(r => r.severity === 'High') ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {risks.length} Risks Flagged
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-white space-y-3">
                      {risks.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No significant red flags detected for this proposal.</p>
                      ) : (
                        risks.map((r) => {
                          const borderClass =
                            r.severity === 'High'
                              ? 'border-l-4 border-l-rose-600 bg-rose-50/20'
                              : r.severity === 'Medium'
                              ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                              : 'border-l-4 border-l-slate-400 bg-slate-50/20';

                          const badgeClass =
                            r.severity === 'High'
                              ? 'bg-rose-600 text-white'
                              : r.severity === 'Medium'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-500 text-white';

                          return (
                            <div key={r.id} className={`p-4 border border-slate-200 rounded-r-xl text-xs space-y-2.5 ${borderClass}`}>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                  {r.severity}
                                </span>
                                <span className="font-semibold text-slate-800 capitalize">{r.category.replace('_', ' ')}</span>
                              </div>
                              <p className="text-slate-800 font-medium">{r.description}</p>

                              {r.redline_suggestion && (
                                <div className="mt-2 p-3 bg-ai-light border border-violet-200 rounded-lg text-slate-900 space-y-1">
                                  <div className="flex items-center gap-1.5 text-ai-accent font-semibold text-[11px]">
                                    <Sparkles className="w-3.5 h-3.5 text-ai-accent" /> AI Suggested Redline Fix:
                                  </div>
                                  <p className="font-mono text-[11px] text-slate-800 leading-relaxed">
                                    "{r.redline_suggestion}"
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 9. AI Negotiation Strategy & Draft Emails (AI Signal Wash) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-indigo" />
              AI Negotiation Strategy & Ready-to-Send Draft Emails
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-ai-light border border-violet-200 text-ai-accent text-xs font-medium rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-ai-accent" /> AI Drafted Terms
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {project.negotiation_tips?.map((item, idx) => (
              <div key={idx} className="bg-ai-light/50 border border-violet-100 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-900 text-sm mb-3">{item.vendorName}</h3>
                  <ul className="space-y-2 mb-4">
                    {item.suggestions?.map((sug, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-ai-accent font-bold">•</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setActiveEmailModal(item)}
                  className="w-full bg-white hover:bg-indigo-50 text-brand-indigo border border-brand-indigo/30 font-medium text-xs py-2 px-3 rounded-lg transition-all inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MailIcon className="w-3.5 h-3.5" /> View Draft Email
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 10. Vendor Collaborative Notes & Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-1 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-indigo" />
              Per-Vendor Internal Notes
            </h2>
            <div className="space-y-4">
              {evaluatedVendors.map((v) => (
                <div key={v.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>{v.vendor_name}</span>
                    <button
                      onClick={() => handleNoteSave(v.id)}
                      className="text-brand-indigo hover:underline text-[11px] font-medium"
                    >
                      {savingNotes[v.id] ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={vendorNotes[v.id] || ''}
                    onChange={(e) => setVendorNotes({ ...vendorNotes, [v.id]: e.target.value })}
                    placeholder={`Internal notes for ${v.vendor_name}...`}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Vertical Timeline Activity Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-level-1 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Project Activity Audit Log
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 relative border-l border-slate-200 ml-3 pl-4">
              {project.activity_log?.map((log, idx) => (
                <div key={idx} className="relative text-xs space-y-1">
                  {/* Dot marker on timeline */}
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-indigo ring-4 ring-white" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="font-mono text-[11px] text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{log.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 11. GROUNDED AI CHAT ASSISTANT (Fixed Overlap Bug via Slide-over Drawer with Backdrop) */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-brand-indigo hover:bg-brand-indigoHover text-white font-medium text-xs px-4 py-3 rounded-full shadow-level-3 flex items-center gap-2.5 transition-all hover:scale-105"
          >
            <Bot className="w-5 h-5 text-indigo-200" />
            <span>Ask Your Proposals (Groq RAG)</span>
          </button>
        ) : null}
      </div>

      {/* Slide-over Drawer with Backdrop */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Semi-transparent backdrop - closing on click */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsChatOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-level-3 flex flex-col">
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-brand-indigo to-indigo-800 text-white p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span className="font-display font-semibold text-sm">Ask Your Proposals Assistant</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-indigo-200 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC] text-xs">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-xl ${
                        msg.sender === 'user'
                          ? 'bg-brand-indigo text-white rounded-br-none shadow-sm'
                          : 'bg-ai-light border border-violet-200 text-slate-900 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>
                      {msg.vendors?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-violet-200/60 text-[10px] text-ai-accent font-semibold">
                          Cited Vendors: {msg.vendors.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isChatThinking && (
                  <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 p-2">
                    <Bot className="w-3.5 h-3.5 animate-spin text-brand-indigo" /> Searching proposal chunks...
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask e.g. Which vendor has 24/7 support?"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-indigo"
                />
                <button
                  type="submit"
                  className="bg-brand-indigo text-white p-2 rounded-lg hover:bg-brand-indigoHover transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 12. Draft Email Modal */}
      {activeEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-level-3 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-semibold text-slate-900 text-base">
                Draft Negotiation Email: {activeEmailModal.vendorName}
              </h3>
              <button
                onClick={() => setActiveEmailModal(null)}
                className="text-slate-400 hover:text-slate-900 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-ai-light border border-violet-200 rounded-xl p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {activeEmailModal.negotiationEmail}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveEmailModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => copyToClipboard(activeEmailModal.negotiationEmail)}
                className="bg-brand-indigo hover:bg-brand-indigoHover text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow transition-all"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEmail ? 'Copied to Clipboard!' : 'Copy Email Text'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MailIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
