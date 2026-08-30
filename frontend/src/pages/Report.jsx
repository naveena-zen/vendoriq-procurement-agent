import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProjectDetails, getExportUrl, approveProjectApi, saveVendorNoteApi, sendChatQuestion } from '../api/client';
import { calculateVendorScore } from '../lib/scoring';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowLeft, Download, ShieldCheck, CheckCircle2, Sliders, AlertTriangle, FileText, FileSpreadsheet,
  Copy, Check, MessageSquare, Send, ChevronDown, ChevronUp, Bot, Sparkles, Clock, Edit3, DollarSign, Award, ExternalLink
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

  // Chat Panel State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am ProcureIQ Proposal Assistant. Ask me any question across your uploaded proposals and I will cite the specific vendor sources.',
      vendors: []
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);

  // UI Accordion Toggles
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
      // Initialize vendor notes
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

    // Re-sort rank descending by dynamicScore
    reScored.sort((a, b) => b.dynamicScore - a.dynamicScore);

    return reScored.map((v, index) => ({
      ...v,
      dynamicRank: index + 1,
    }));
  }, [project, simulatorWeights]);

  // Handle What-If Weight Sliders
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

  // Handle Approve & Sign
  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approverName.trim()) return;
    try {
      setIsApproving(true);
      const res = await approveProjectApi(projectId, approverName);
      setApprovalData(res);
      loadReport(); // refresh activity log
    } catch (err) {
      alert('Approval failed: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Vendor Note Save
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

  // Handle Chat Submit
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Bot className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Loading Intelligence Report...</h3>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-lg">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Report Unavailable</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">{error || 'Project not found'}</p>
          <Link to="/" className="bg-brand-600 text-white font-semibold text-xs px-4 py-2 rounded-xl">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Recommended Vendor logic
  const topVendor = evaluatedVendors[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Sticky Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link to="/" className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base truncate">{project.name}</h1>
                {approvalData && approvalData.status === 'APPROVED & SIGNED' && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold rounded-full flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Signed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto">
                <span className="font-medium">Must-haves:</span>
                {project.requirements?.mustHaves?.map((mh, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] whitespace-nowrap">
                    {mh}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Top Bar Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Export Dropdown */}
            <div className="relative group">
              <button className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all">
                <Download className="w-4 h-4 text-brand-600" /> Export <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block z-40 p-1">
                <a
                  href={getExportUrl(projectId, 'markdown')}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> Markdown Executive Summary
                </a>
                <a
                  href={getExportUrl(projectId, 'xlsx')}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel Workbook (.xlsx)
                </a>
                <a
                  href={getExportUrl(projectId, 'ariba')}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" /> Ariba / Coupa JSON Import
                </a>
              </div>
            </div>

            {/* Approve & Sign Button */}
            {!approvalData ? (
              <form onSubmit={handleApprove} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Approver Name"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 w-32 focus:bg-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow inline-flex items-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Approve & Sign
                </button>
              </form>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved by {approvalData.approvedBy} ({approvalData.approvedAt})
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 1. Executive Summary Card */}
        <div className="bg-indigo-50/70 border-l-4 border-brand-600 border-t border-r border-b border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Procurement Executive Summary</h2>
            </div>
            {topVendor && (
              <span className="bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                🏆 Recommended Vendor: {topVendor.vendor_name}
              </span>
            )}
          </div>

          <p className="text-slate-800 text-sm leading-relaxed mb-4 whitespace-pre-line font-normal">
            {project.summary?.text || 'Analysis completed across all uploaded proposal documents.'}
          </p>

          {project.summary?.topRisks?.length > 0 && (
            <div className="bg-white/80 border border-indigo-100 rounded-xl p-3.5 mb-4">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block mb-2">
                Key Risks to Watch Before Signing:
              </span>
              <ul className="space-y-1">
                {project.summary.topRisks.map((rText, idx) => (
                  <li key={idx} className="text-xs text-rose-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {rText}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <a
              href={getExportUrl(projectId, 'markdown')}
              download
              className="text-xs font-bold text-brand-700 hover:text-brand-900 bg-white border border-indigo-200 px-3.5 py-1.5 rounded-xl hover:shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Executive Summary
            </a>
          </div>
        </div>

        {/* 2. Vendor Ranking Cards */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Vendor Compliance Ranking Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {evaluatedVendors.map((vendor) => {
              const ext = vendor.extraction || {};
              const cost = ext.pricing?.totalCost;
              const costStr = cost ? `$${cost.toLocaleString()}` : 'Not specified';
              
              const medal = vendor.dynamicRank === 1 ? '🥇' : vendor.dynamicRank === 2 ? '🥈' : '🥉';
              const benchmark = vendor.price_benchmark || 'typical';

              const benchBadge =
                benchmark === 'low'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : benchmark === 'high'
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div
                  key={vendor.id}
                  className={`bg-white border rounded-2xl p-6 shadow-sm relative transition-all ${
                    vendor.dynamicRank === 1 ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{medal}</span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{vendor.vendor_name}</h3>
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{vendor.file_name}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-brand-600">
                      {vendor.dynamicScore}%
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Quoted Total Cost:</span>
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span>{costStr}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${benchBadge}`}>
                          {benchmark} cost
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
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Top Features</span>
                    <div className="flex flex-wrap gap-1">
                      {(ext.features || []).slice(0, 3).map((feat, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium">
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

        {/* 3. Live Client-Side "What-If" Scenario Simulator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-600" />
                Live "What-If" Re-Weighting Scenario Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Drag weight sliders to dynamically recalculate vendor compliance scores and ranking order in real-time.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Browser Reactive Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Price Weight</span>
                <span className="text-brand-600">{simulatorWeights.price}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.price}
                onChange={(e) => handleWeightChange('price', e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>SLA Weight</span>
                <span className="text-brand-600">{simulatorWeights.sla}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.sla}
                onChange={(e) => handleWeightChange('sla', e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Features Weight</span>
                <span className="text-brand-600">{simulatorWeights.features}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.features}
                onChange={(e) => handleWeightChange('features', e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Support Weight</span>
                <span className="text-brand-600">{simulatorWeights.support}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simulatorWeights.support}
                onChange={(e) => handleWeightChange('support', e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. Side-by-Side Vendor Comparison Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Side-by-Side Proposal Comparison Matrix
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 font-bold text-slate-700 w-48 sticky left-0 bg-slate-50 border-r border-slate-200">
                    Attribute / Feature
                  </th>
                  {evaluatedVendors.map((v) => (
                    <th key={v.id} className="p-3 font-bold text-slate-900 border-r border-slate-100 min-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span>{v.dynamicRank === 1 ? '🥇' : v.dynamicRank === 2 ? '🥈' : '🥉'}</span>
                        <span>{v.vendor_name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Total Cost Row */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Total Quoted Cost</td>
                  {evaluatedVendors.map((v) => {
                    const cost = v.extraction?.pricing?.totalCost;
                    const minCost = Math.min(...evaluatedVendors.map(x => x.extraction?.pricing?.totalCost || Infinity));
                    const isBest = cost && cost === minCost;
                    return (
                      <td key={v.id} className={`p-3 border-r border-slate-100 font-bold ${isBest ? 'bg-emerald-50 text-emerald-800' : 'text-slate-800'}`}>
                        {cost ? `$${cost.toLocaleString()}` : <span className="text-slate-400 italic font-normal">Not specified</span>}
                        {isBest && <Check className="w-3.5 h-3.5 inline-block ml-1 text-emerald-600" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Uptime SLA */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Uptime SLA Guarantee</td>
                  {evaluatedVendors.map((v) => {
                    const sla = v.extraction?.sla?.uptimeGuarantee;
                    const isBest = sla && (sla.includes('99.99%') || sla.includes('99.99'));
                    return (
                      <td key={v.id} className={`p-3 border-r border-slate-100 font-semibold ${isBest ? 'bg-emerald-50 text-emerald-800' : 'text-slate-800'}`}>
                        {sla || <span className="text-slate-400 italic font-normal">Not specified</span>}
                        {isBest && <Check className="w-3.5 h-3.5 inline-block ml-1 text-emerald-600" />}
                      </td>
                    );
                  })}
                </tr>

                {/* Support Hours */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Support Hours SLA</td>
                  {evaluatedVendors.map((v) => {
                    const supp = v.extraction?.sla?.supportHours;
                    const isBest = supp && (supp.includes('24/7') || supp.includes('24x7'));
                    return (
                      <td key={v.id} className={`p-3 border-r border-slate-100 ${isBest ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-800'}`}>
                        {supp || <span className="text-slate-400 italic font-normal">Not specified</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* Payment Terms */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Payment Terms</td>
                  {evaluatedVendors.map((v) => (
                    <td key={v.id} className="p-3 border-r border-slate-100 text-slate-800">
                      {v.extraction?.pricing?.paymentTerms || <span className="text-slate-400 italic">Not specified</span>}
                    </td>
                  ))}
                </tr>

                {/* Contract Duration & Renewal */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Contract Duration & Renewal</td>
                  {evaluatedVendors.map((v) => (
                    <td key={v.id} className="p-3 border-r border-slate-100 text-slate-800">
                      {v.extraction?.contractTerms?.duration} - {v.extraction?.contractTerms?.renewalTerms || <span className="text-slate-400 italic">Not specified</span>}
                    </td>
                  ))}
                </tr>

                {/* Must-Have Features Coverage */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Features Included</td>
                  {evaluatedVendors.map((v) => {
                    const feats = v.extraction?.features || [];
                    return (
                      <td key={v.id} className="p-3 border-r border-slate-100 text-slate-800">
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

                {/* Notes on Missing Info */}
                <tr>
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">Missing Information Notes</td>
                  {evaluatedVendors.map((v) => {
                    const missing = v.extraction?.notesOnMissingInfo || [];
                    return (
                      <td key={v.id} className="p-3 border-r border-slate-100 text-slate-600 italic">
                        {missing.length > 0 ? missing.join('; ') : <span className="text-slate-400">None</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Cost Breakdown Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-600" />
            Vendor Cost Comparison Breakdown
          </h2>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evaluatedVendors.map(v => ({
                name: v.vendor_name,
                cost: v.extraction?.pricing?.totalCost || 0,
                rank: v.dynamicRank
              }))}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Total Cost']} />
                <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                  {evaluatedVendors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.dynamicRank === 1 ? '#4f46e5' : entry.dynamicRank === 2 ? '#6366f1' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Hybrid Risk & Red Flags Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Contract Risk & Redline Suggestions Audit
          </h2>

          <div className="space-y-4">
            {evaluatedVendors.map((vendor) => {
              const isOpen = openRisksVendor === vendor.id;
              const risks = vendor.risks || [];

              return (
                <div key={vendor.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenRisksVendor(isOpen ? null : vendor.id)}
                    className="w-full bg-slate-50 hover:bg-slate-100 p-4 flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm">{vendor.vendor_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        risks.some(r => r.severity === 'High') ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {risks.length} Risks Detected
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
                          const badgeColor =
                            r.severity === 'High'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : r.severity === 'Medium'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200';

                          return (
                            <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border ${badgeColor}`}>
                                  {r.severity}
                                </span>
                                <span className="font-semibold text-slate-700 capitalize">{r.category.replace('_', ' ')}</span>
                              </div>
                              <p className="text-slate-800 font-medium">{r.description}</p>
                              {r.redline_suggestion && (
                                <div className="mt-2 p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-rose-900">
                                  <span className="font-bold block text-[10px] uppercase text-rose-700 mb-1">
                                    💡 AI Suggested Contract Redline Fix:
                                  </span>
                                  <p className="font-mono text-[11px] leading-relaxed">"{r.redline_suggestion}"</p>
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

        {/* 7. Negotiation Strategy & Email Drafting Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" />
            AI Negotiation Strategy & Ready-to-Send Draft Emails
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {project.negotiation_tips?.map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-3">{item.vendorName}</h3>
                  <ul className="space-y-2 mb-4">
                    {item.suggestions?.map((sug, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <span className="text-brand-600 font-bold">•</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setActiveEmailModal(item)}
                  className="w-full bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-brand-700 font-semibold text-xs py-2 px-3 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MailIcon className="w-3.5 h-3.5" /> View Draft Negotiation Email
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 8. Vendor Collaborative Notes & Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-600" />
              Per-Vendor Collaborative Notes
            </h2>
            <div className="space-y-4">
              {evaluatedVendors.map((v) => (
                <div key={v.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>{v.vendor_name}</span>
                    <button
                      onClick={() => handleNoteSave(v.id)}
                      className="text-brand-600 hover:underline text-[11px]"
                    >
                      {savingNotes[v.id] ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={vendorNotes[v.id] || ''}
                    onChange={(e) => setVendorNotes({ ...vendorNotes, [v.id]: e.target.value })}
                    placeholder={`Enter custom internal notes for ${v.vendor_name}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Project Activity Audit Log
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {project.activity_log?.map((log, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{log.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 9. "Ask Your Proposals" Grounded AI Chat Panel Widget */}
      <div className="fixed bottom-4 right-4 z-40">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 group transition-all"
          >
            <Bot className="w-5 h-5" />
            <span>Ask Your Proposals (Groq RAG)</span>
          </button>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col h-96 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="font-bold text-xs">Ask Your Proposals Assistant</span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Message List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl ${
                      msg.sender === 'user'
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.vendors?.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-brand-700 font-semibold">
                        Cited Vendors: {msg.vendors.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatThinking && (
                <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 animate-spin text-brand-600" /> Searching proposal chunks...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="p-2.5 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask e.g. Which vendor has 24/7 support?"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="bg-brand-600 text-white p-2 rounded-xl hover:bg-brand-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 10. Draft Email Modal */}
      {activeEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Draft Negotiation Email: {activeEmailModal.vendorName}
              </h3>
              <button
                onClick={() => setActiveEmailModal(null)}
                className="text-slate-400 hover:text-slate-900 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {activeEmailModal.negotiationEmail}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveEmailModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => copyToClipboard(activeEmailModal.negotiationEmail)}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow"
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
